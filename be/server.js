// ============================================================
// server.js - HỆ THỐNG GIÁM SÁT TRUYỀN DỊCH (ES Module)
// ============================================================

import express from 'express';
import cors    from 'cors';
import crypto  from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname }       from 'path';
import dotenv from 'dotenv';
dotenv.config();

const require   = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();

app.use(cors({
  // Sử dụng mảng để khai báo các tên miền được phép gọi API
  origin: [
    'http://localhost:5173', 
    'https://bmed1-2.onrender.com' // Tự thay bằng link thật của bmed1-2 (Frontend)
  ],
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ── Pool MySQL2 ──────────────────────────────────────────────
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:    Number(    process.env.DB_PORT)     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'infusion_monitoring',
  ssl:                { rejectUnauthorized: false },
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           '+07:00',
});

pool.getConnection()
  .then(c => { console.log('[DB] Ket noi MySQL thanh cong!'); c.release(); })
  .catch(e => { console.error('[DB] Loi ket noi MySQL:', e.message); process.exit(1); });

// ── Token store ──────────────────────────────────────────────
const tokenStore = new Map();
function generateToken() { return crypto.randomBytes(32).toString('hex'); }

function requireAuth(req, res, next) {
  const auth  = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || !tokenStore.has(token)) {
    return res.status(401).json({ error: 'Chua dang nhap hoac phien het han.' });
  }
  req.user = tokenStore.get(token);
  next();
}

function requireTechnician(req, res, next) {
  if (req.user?.role !== 'technician') {
    return res.status(403).json({ error: 'Chi ky thuat vien moi co quyen nay.' });
  }
  next();
}

// ── Bộ đệm trung bình trượt (in-memory) ─────────────────────
const BUFFER_SIZE            = 10;
const TRONG_LUONG_VO_CHAI    = 30;
const SO_GIOT_TREN_ML        = 20;
const NGUONG_SAP_HET_ML      = 20;
const NGUONG_LECH_TOC_DO_PCT = 0.15;

const sessionBuffer = new Map();
function getBuffer(sid) {
  if (!sessionBuffer.has(sid)) sessionBuffer.set(sid, { samples: [] });
  return sessionBuffer.get(sid);
}
function clearBuffer(sid) { sessionBuffer.set(sid, { samples: [] }); }

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ============================================================
// ESP32 — POST /du-lieu-esp  (cả 2 path)
// Body: { mac_address, current_drop_rate, current_weight }
//    hoặc { session_id, current_drop_rate, current_weight }
// ============================================================
async function nhanDuLieuESP(req, res) {
  const conn = await pool.getConnection();
  try {
    let { session_id, mac_address, current_drop_rate, current_weight } = req.body;

    if (current_drop_rate == null || current_weight == null) {
      conn.release();
      return res.status(400).json({ error: 'Thieu current_drop_rate hoac current_weight' });
    }

    if (!session_id && mac_address) {
      const [[device]] = await conn.query(
        'SELECT id FROM infusion_devices WHERE mac_address = ? LIMIT 1', [mac_address]
      );
      if (!device) { conn.release(); return res.status(404).json({ error: 'Khong tim thay MAC: ' + mac_address }); }
      const [[activeSession]] = await conn.query(
        "SELECT id FROM infusion_sessions WHERE device_id = ? AND status != 'completed' ORDER BY start_at DESC LIMIT 1",
        [device.id]
      );
      if (!activeSession) { conn.release(); return res.status(200).json({ status: 'no_active_session' }); }
      session_id = activeSession.id;
    }

    if (!session_id) { conn.release(); return res.status(400).json({ error: 'Thieu session_id hoac mac_address' }); }

    const [[session]] = await conn.query(
      "SELECT id, prescribed_drop_rate, initial_weight, status FROM infusion_sessions WHERE id = ? AND status != 'completed' LIMIT 1",
      [session_id]
    );
    if (!session) {
      clearBuffer(session_id); conn.release();
      return res.status(404).json({ error: 'Khong tim thay phien: ' + session_id });
    }

    const dropRate = parseFloat(current_drop_rate);
    const weight   = parseFloat(current_weight);
    let the_tich_con_lai = Math.max(0, weight - TRONG_LUONG_VO_CHAI);
    let thoi_gian_con_lai = dropRate > 0 ? Math.round(the_tich_con_lai / (dropRate / SO_GIOT_TREN_ML)) : 0;

    // Lưu log mỗi lần gửi
    await conn.query(
      'INSERT INTO infusion_metrics_logs (session_id, current_drop_rate, current_weight, remaining_time, recorded_at) VALUES (?,?,?,?,NOW())',
      [session_id, dropRate, weight, thoi_gian_con_lai]
    );

    // Bộ đệm
    const buf = getBuffer(session_id);
    buf.samples.push({ dropRate, the_tich_con_lai });

    if (buf.samples.length < BUFFER_SIZE) {
      conn.release();
      return res.status(200).json({ status: 'buffering', buffer_count: buf.samples.length, buffer_needed: BUFFER_SIZE, the_tich_con_lai, thoi_gian_con_lai });
    }

    // Đủ 10 lượt → ra quyết định
    const avgDropRate = buf.samples.reduce((s, x) => s + x.dropRate, 0) / BUFFER_SIZE;
    const avgVolume   = buf.samples.reduce((s, x) => s + x.the_tich_con_lai, 0) / BUFFER_SIZE;
    clearBuffer(session_id);

    let newStatus = session.status;

    // Cảnh báo sắp hết
    if (avgVolume > 0 && avgVolume <= NGUONG_SAP_HET_ML) {
      const [[ex]] = await conn.query(
        "SELECT id FROM infusion_alerts WHERE session_id=? AND alert_type='sap_het' AND is_read=0 AND handled_at IS NULL LIMIT 1",
        [session_id]
      );
      if (!ex) {
        await conn.query(
          "INSERT INTO infusion_alerts (session_id,alert_type,message,is_read,triggered_at) VALUES (?,'sap_het',?,FALSE,NOW())",
          [session_id, 'CANH BAO: Dich sap het — con ' + avgVolume.toFixed(1) + ' ml']
        );
      }
      if (newStatus === 'normal') newStatus = 'warning';
    }

    // Cảnh báo tốc độ
    const prescribedRate = parseFloat(session.prescribed_drop_rate || 0);
    if (prescribedRate > 0 && avgDropRate > 0) {
      const lech = Math.abs(avgDropRate - prescribedRate) / prescribedRate;
      if (lech >= NGUONG_LECH_TOC_DO_PCT) {
        const [[ex]] = await conn.query(
          "SELECT id FROM infusion_alerts WHERE session_id=? AND alert_type='loi_toc_do' AND is_read=0 AND handled_at IS NULL LIMIT 1",
          [session_id]
        );
        if (!ex) {
          const huong = avgDropRate > prescribedRate ? 'nhanh hon' : 'cham hon';
          await conn.query(
            "INSERT INTO infusion_alerts (session_id,alert_type,message,is_read,triggered_at) VALUES (?,'loi_toc_do',?,FALSE,NOW())",
            [session_id, 'LOI TOC DO: TB 50s ' + huong + ' ' + (lech*100).toFixed(1) + '% (do:' + avgDropRate.toFixed(1) + ' y-lenh:' + prescribedRate + ' giot/phut)']
          );
        }
        newStatus = 'urgent';
      }
    }

    if (newStatus !== session.status) {
      await conn.query('UPDATE infusion_sessions SET status=? WHERE id=?', [newStatus, session_id]);
    }

    conn.release();
    res.status(200).json({ status: 'decided', avg_drop_rate: +avgDropRate.toFixed(2), avg_volume_ml: +avgVolume.toFixed(2), thoi_gian_con_lai, session_status: newStatus });

  } catch (err) {
    console.error('[ESP32]', err.message);
    try { conn.release(); } catch {}
    res.status(500).json({ error: err.message });
  }
}

app.post('/du-lieu-esp', nhanDuLieuESP);
app.post('/api/du-lieu-esp', nhanDuLieuESP);

// ============================================================
// AUTH
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Thieu email hoac mat khau.' });
    const [[user]] = await pool.query(
      'SELECT id,name,email,role FROM users WHERE email=? AND password_hash=? LIMIT 1',
      [email, password]
    );
    if (!user) return res.status(401).json({ error: 'Email hoac mat khau khong dung.' });
    const token = generateToken();
    tokenStore.set(token, { userId: user.id, role: user.role, name: user.name, email: user.email });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization'].replace('Bearer ', '').trim();
  tokenStore.delete(token);
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

// ============================================================
// DEVICES
// ============================================================
app.get('/api/devices', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,device_no,mac_address,label,location_room,location_bed,status,created_at FROM infusion_devices ORDER BY device_no ASC'
    );
    res.json(rows.map(d => ({
      id: d.id, deviceNo: d.device_no, macAddress: d.mac_address,
      label: d.label || ('Thiết bị ' + d.device_no),
      locationRoom: d.location_room, locationBed: d.location_bed,
      status: d.status, createdAt: d.created_at,
    })));
  } catch (err) { res.json([]); }
});

app.post('/api/devices', requireAuth, requireTechnician, async (req, res) => {
  try {
    const { macAddress, label } = req.body;
    if (!macAddress) return res.status(400).json({ error: 'Thieu macAddress.' });
    const [[ex]] = await pool.query('SELECT id FROM infusion_devices WHERE mac_address=? LIMIT 1', [macAddress]);
    if (ex) return res.status(409).json({ error: 'MAC address da ton tai.' });

    // Tạo thiết bị trước (device_no được DB tự cấp số tăng dần 1,2,3,...)
    await pool.query("INSERT INTO infusion_devices (mac_address,label,status,registered_by) VALUES (?,NULL,'available',?)",
      [macAddress, req.user.userId]);

    const [[created]] = await pool.query(
      'SELECT id,device_no FROM infusion_devices WHERE mac_address=? LIMIT 1', [macAddress]
    );

    // Nếu kỹ thuật viên không nhập nhãn riêng → tự đặt tên "Thiết bị {device_no}"
    const finalLabel = (label && label.trim()) ? label.trim() : ('Thiết bị ' + created.device_no);
    await pool.query('UPDATE infusion_devices SET label=? WHERE id=?', [finalLabel, created.id]);

    const [[d]] = await pool.query(
      'SELECT id,device_no,mac_address,label,location_room,location_bed,status,created_at FROM infusion_devices WHERE id=? LIMIT 1', [created.id]
    );
    res.status(201).json({ id: d.id, deviceNo: d.device_no, macAddress: d.mac_address, label: d.label, locationRoom: d.location_room, locationBed: d.location_bed, status: d.status, createdAt: d.created_at });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/devices/:id', requireAuth, requireTechnician, async (req, res) => {
  try {
    const [[d]] = await pool.query('SELECT id,status FROM infusion_devices WHERE id=? LIMIT 1', [req.params.id]);
    if (!d) return res.status(404).json({ error: 'Khong tim thay thiet bi.' });
    if (d.status === 'active') return res.status(409).json({ error: 'Khong the xoa thiet bi dang co phien truyen.' });
    await pool.query('DELETE FROM infusion_devices WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/devices/:id/repair-done', requireAuth, requireTechnician, async (req, res) => {
  try {
    const [[d]] = await pool.query('SELECT id FROM infusion_devices WHERE id=? LIMIT 1', [req.params.id]);
    if (!d) return res.status(404).json({ error: 'Khong tim thay thiet bi.' });
    await pool.query("UPDATE infusion_devices SET status='available' WHERE id=?", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// SESSIONS
// ============================================================
app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.id,
        p.full_name AS patientName, p.room_number AS room, p.bed_number AS bed,
        d.mac_address AS deviceId, d.label AS deviceLabel,
        ft.name AS fluidType,
        s.initial_weight AS volumeInitial,
        s.prescribed_drop_rate AS prescribedDropRate,
        s.status, s.start_at AS createdAt,
        (SELECT m.current_drop_rate FROM infusion_metrics_logs m WHERE m.session_id=s.id ORDER BY m.recorded_at DESC LIMIT 1) AS dropRate,
        (SELECT (m.current_weight - 30) FROM infusion_metrics_logs m WHERE m.session_id=s.id ORDER BY m.recorded_at DESC LIMIT 1) AS volumeRemaining,
        (SELECT m.remaining_time FROM infusion_metrics_logs m WHERE m.session_id=s.id ORDER BY m.recorded_at DESC LIMIT 1) AS remainingTime,
        EXISTS(SELECT 1 FROM infusion_issues i WHERE i.session_id=s.id AND i.status!='resolved') AS manualError
      FROM infusion_sessions s
      JOIN patient_profiles p  ON s.patient_id=p.id
      JOIN infusion_devices d  ON s.device_id=d.id
      LEFT JOIN fluid_types ft ON s.fluid_type_id=ft.id
      WHERE s.status != 'completed'
      ORDER BY s.start_at DESC`
    );
    res.json(rows.map(r => ({
      ...r,
      volumeRemaining:    r.volumeRemaining != null ? +parseFloat(r.volumeRemaining).toFixed(1) : +parseFloat(r.volumeInitial||0).toFixed(1),
      dropRate:           r.dropRate ?? 0,
      remainingTime:      r.remainingTime ?? null,
      prescribedDropRate: r.prescribedDropRate ?? 0,
      manualError:        Boolean(r.manualError),
    })));
  } catch (err) { console.error('[GET /api/sessions]', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/sessions/:id/metrics', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT current_drop_rate,current_weight,remaining_time,recorded_at FROM infusion_metrics_logs WHERE session_id=? ORDER BY recorded_at DESC LIMIT 60',
      [req.params.id]
    );
    res.json(rows.reverse());
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/sessions', requireAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { patientName, room, bed, deviceId, fluidType, volumeInitial, dropRate } = req.body;
    if (!patientName || !deviceId || !volumeInitial) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ error: 'Thieu: patientName, deviceId, volumeInitial' });
    }

    let patientId;
    const [existing] = await conn.query(
      'SELECT id FROM patient_profiles WHERE full_name=? AND room_number=? AND bed_number=? LIMIT 1',
      [patientName, room??null, bed??null]
    );
    if (existing.length > 0) {
      patientId = existing[0].id;
    } else {
      await conn.query('INSERT INTO patient_profiles (full_name,room_number,bed_number) VALUES (?,?,?)', [patientName, room??null, bed??null]);
      const [[np]] = await conn.query('SELECT id FROM patient_profiles WHERE full_name=? ORDER BY created_at DESC LIMIT 1', [patientName]);
      patientId = np.id;
    }

    const [[device]] = await conn.query(
      'SELECT id,status FROM infusion_devices WHERE mac_address=? OR id=? LIMIT 1', [deviceId, deviceId]
    );
    if (!device) { await conn.rollback(); conn.release(); return res.status(404).json({ error: 'Khong tim thay thiet bi: ' + deviceId }); }
    if (device.status === 'active') { await conn.rollback(); conn.release(); return res.status(409).json({ error: 'Thiet bi dang co phien truyen khac.' }); }

    let fluidTypeId = null;
    if (fluidType) {
      const [fts] = await conn.query('SELECT id FROM fluid_types WHERE name LIKE ? LIMIT 1', ['%'+fluidType+'%']);
      if (fts.length > 0) fluidTypeId = fts[0].id;
    }

    const prescribedRate = Number(dropRate) || 60;
    await conn.query(
      "INSERT INTO infusion_sessions (device_id,patient_id,staff_id,fluid_type_id,initial_weight,prescribed_drop_rate,status) VALUES (?,?,?,?,?,?,'normal')",
      [device.id, patientId, req.user.userId, fluidTypeId, volumeInitial, prescribedRate]
    );
    const [[ns]] = await conn.query(
      `SELECT s.id, p.full_name AS patientName, p.room_number AS room, p.bed_number AS bed,
              d.mac_address AS deviceId, ft.name AS fluidType,
              s.initial_weight AS volumeInitial, s.prescribed_drop_rate AS prescribedDropRate,
              s.status, s.start_at AS createdAt
       FROM infusion_sessions s
       JOIN patient_profiles p ON s.patient_id=p.id
       JOIN infusion_devices d ON s.device_id=d.id
       LEFT JOIN fluid_types ft ON s.fluid_type_id=ft.id
       WHERE s.patient_id=? ORDER BY s.start_at DESC LIMIT 1`, [patientId]
    );
    await conn.query("UPDATE infusion_devices SET status='active' WHERE id=?", [device.id]);
    await conn.commit(); conn.release();
    res.status(201).json({ ...ns, volumeRemaining: Number(volumeInitial), dropRate: prescribedRate, prescribedDropRate: prescribedRate, manualError: false });
  } catch (err) {
    await conn.rollback(); conn.release();
    console.error('[POST /api/sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/sessions/:id/end', requireAuth, async (req, res) => {
  try {
    const [[s]] = await pool.query('SELECT device_id FROM infusion_sessions WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien' });
    await pool.query("UPDATE infusion_sessions SET status='completed',end_at=NOW() WHERE id=?", [req.params.id]);
    await pool.query("UPDATE infusion_devices SET status='available' WHERE id=?", [s.device_id]);
    clearBuffer(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/sessions/:id/device-error', requireAuth, async (req, res) => {
  try {
    const [[s]] = await pool.query('SELECT device_id FROM infusion_sessions WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien' });
    await pool.query("UPDATE infusion_sessions SET status='completed',end_at=NOW() WHERE id=?", [req.params.id]);
    await pool.query("UPDATE infusion_devices SET status='error' WHERE id=?", [s.device_id]);
    await pool.query(
      "INSERT INTO infusion_issues (session_id,reported_by,issue_type,description,status) VALUES (?,'"+req.user.userId+"','device_error','Loi thiet bi - bao cao tu Y ta','pending')",
      [req.params.id]
    );
    clearBuffer(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Alias cũ
app.patch('/api/sessions/:id/error', requireAuth, async (req, res) => {
  try {
    const [[s]] = await pool.query('SELECT device_id FROM infusion_sessions WHERE id=?', [req.params.id]);
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien' });
    await pool.query("UPDATE infusion_sessions SET status='completed',end_at=NOW() WHERE id=?", [req.params.id]);
    await pool.query("UPDATE infusion_devices SET status='error' WHERE id=?", [s.device_id]);
    await pool.query(
      "INSERT INTO infusion_issues (session_id,reported_by,issue_type,description,status) VALUES (?,?,'device_error','Loi thiet bi','pending')",
      [req.params.id, req.user.userId]
    );
    clearBuffer(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/sessions/:id/resolve-alert', requireAuth, async (req, res) => {
  try {
    const { alertType } = req.body;
    await pool.query(
      "UPDATE infusion_alerts SET is_read=1,handled_at=NOW() WHERE session_id=? AND alert_type=? AND handled_at IS NULL",
      [req.params.id, alertType || 'loi_toc_do']
    );
    await pool.query("UPDATE infusion_sessions SET status='normal' WHERE id=? AND status='urgent'", [req.params.id]);
    clearBuffer(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// ALERTS
// ============================================================
app.get('/api/alerts', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.alert_type, a.message, a.is_read, a.triggered_at, a.handled_at,
              s.id AS session_id,
              p.full_name AS patientName, p.room_number AS room, p.bed_number AS bed,
              d.mac_address AS deviceId, d.label AS deviceLabel
       FROM infusion_alerts a
       JOIN infusion_sessions s ON a.session_id=s.id
       JOIN patient_profiles  p ON s.patient_id=p.id
       JOIN infusion_devices  d ON s.device_id=d.id
       WHERE a.handled_at IS NULL
       ORDER BY a.triggered_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { res.json([]); }
});

app.patch('/api/alerts/:id/read', requireAuth, async (req, res) => {
  try {
    await pool.query('UPDATE infusion_alerts SET is_read=1 WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// KHỞI ĐỘNG
// ============================================================
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log('[Server] Dang chay tai http://localhost:' + PORT));