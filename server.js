// ============================================================
// server.js - HỆ THỐNG GIÁM SÁT TRUYỀN DỊCH
// ============================================================
'use strict';

const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app  = express();
const pool = require('./config/pool'); // ✅ dùng lại pool từ config, không tạo 2 lần

// ── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// ── Kiểm tra kết nối DB khi khởi động ───────────────────────
pool.getConnection()
  .then(c => { console.log('[DB] Ket noi MySQL thanh cong!'); c.release(); })
  .catch(e => { console.error('[DB] Loi ket noi MySQL:', e.message); process.exit(1); });

// ── Routes ESP32 ─────────────────────────────────────────────
const deviceRoutes = require('./routes/deviceRoutes');
app.use('/', deviceRoutes); // ✅ sửa './' thành '/'

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── GET /api/sessions ────────────────────────────────────────
app.get('/api/sessions', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id,
        p.full_name                           AS patientName,
        p.room_number                         AS room,
        p.bed_number                          AS bed,
        d.mac_address                         AS deviceId,
        ft.name                               AS fluidType,
        s.initial_weight                      AS volumeInitial,
        s.status,
        s.start_at                            AS createdAt,
        (SELECT m.current_drop_rate
           FROM infusion_metrics_logs m
          WHERE m.session_id = s.id
          ORDER BY m.recorded_at DESC LIMIT 1) AS dropRate,
        (SELECT m.current_weight
           FROM infusion_metrics_logs m
          WHERE m.session_id = s.id
          ORDER BY m.recorded_at DESC LIMIT 1) AS volumeRemaining,
        (SELECT m.remaining_time
           FROM infusion_metrics_logs m
          WHERE m.session_id = s.id
          ORDER BY m.recorded_at DESC LIMIT 1) AS remainingTime,
        EXISTS(
          SELECT 1 FROM infusion_issues i
           WHERE i.session_id = s.id
             AND i.status != 'resolved'
        ) AS manualError
      FROM infusion_sessions s
      JOIN  patient_profiles p  ON s.patient_id    = p.id
      JOIN  infusion_devices d  ON s.device_id     = d.id
      LEFT JOIN fluid_types ft  ON s.fluid_type_id = ft.id
      WHERE s.status != 'completed'
      ORDER BY s.start_at DESC
    `);

    res.json(rows.map(r => ({
      ...r,
      volumeRemaining: r.volumeRemaining ?? r.volumeInitial,
      dropRate:        r.dropRate        ?? 0,
      remainingTime:   r.remainingTime   ?? null,
      manualError:     Boolean(r.manualError),
      ended:           false,
    })));
  } catch (err) {
    console.error('[GET /api/sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/sessions/:id/metrics ────────────────────────────
app.get('/api/sessions/:id/metrics', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT current_drop_rate, current_weight, remaining_time, recorded_at
         FROM infusion_metrics_logs
        WHERE session_id = ?
        ORDER BY recorded_at DESC LIMIT 60`,
      [req.params.id]
    );
    res.json(rows.reverse());
  } catch (err) {
    console.error('[GET /api/sessions/:id/metrics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/sessions ───────────────────────────────────────
app.post('/api/sessions', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      patientName, room, bed,
      deviceId, fluidType, volumeInitial, dropRate,
    } = req.body;

    // Validate bắt buộc
    if (!patientName || !deviceId || !volumeInitial) {
      await conn.rollback();
      return res.status(400).json({ error: 'Thieu truong bat buoc: patientName, deviceId, volumeInitial' });
    }

    // 1. Tìm hoặc tạo bệnh nhân
    let patientId;
    const [existing] = await conn.query(
      `SELECT id FROM patient_profiles
        WHERE full_name = ? AND room_number = ? AND bed_number = ?
        LIMIT 1`,
      [patientName, room ?? null, bed ?? null]
    );

    if (existing.length > 0) {
      patientId = existing[0].id;
    } else {
      await conn.query(
        `INSERT INTO patient_profiles (full_name, room_number, bed_number)
         VALUES (?, ?, ?)`,
        [patientName, room ?? null, bed ?? null]
      );
      const [[np]] = await conn.query(
        `SELECT id FROM patient_profiles
          WHERE full_name = ?
          ORDER BY created_at DESC LIMIT 1`,
        [patientName]
      );
      patientId = np.id;
    }

    // 2. Tìm thiết bị theo mac_address
    const [[device]] = await conn.query(
      `SELECT id, status FROM infusion_devices
        WHERE mac_address = ? LIMIT 1`,
      [deviceId]
    );
    if (!device) {
      await conn.rollback();
      return res.status(404).json({ error: `Khong tim thay thiet bi: ${deviceId}` });
    }
    if (device.status === 'active') {
      await conn.rollback();
      return res.status(409).json({ error: 'Thiet bi dang co phien truyen khac.' });
    }

    // 3. Tìm loại dịch (không bắt buộc)
    let fluidTypeId = null;
    if (fluidType) {
      const [fts] = await conn.query(
        `SELECT id FROM fluid_types WHERE name LIKE ? LIMIT 1`,
        [`%${fluidType}%`]
      );
      if (fts.length > 0) fluidTypeId = fts[0].id;
    }

    // 4. Lấy staff đầu tiên (tạm thời — sau này lấy từ JWT)
    const [staffRows] = await conn.query('SELECT id FROM users LIMIT 1');
    if (staffRows.length === 0) {
      await conn.rollback();
      return res.status(500).json({ error: 'Bang users trong. Can INSERT 1 user truoc.' });
    }
    const staffId = staffRows[0].id;

    // 5. Tạo phiên truyền
    await conn.query(
      `INSERT INTO infusion_sessions
         (device_id, patient_id, staff_id, fluid_type_id, initial_weight, status)
       VALUES (?, ?, ?, ?, ?, 'normal')`,
      [device.id, patientId, staffId, fluidTypeId, volumeInitial]
    );

    // 6. Lấy lại phiên vừa tạo để trả về đầy đủ thông tin
    const [[newSession]] = await conn.query(
      `SELECT
         s.id,
         p.full_name        AS patientName,
         p.room_number      AS room,
         p.bed_number       AS bed,
         d.mac_address      AS deviceId,
         ft.name            AS fluidType,
         s.initial_weight   AS volumeInitial,
         s.status,
         s.start_at         AS createdAt
       FROM infusion_sessions s
       JOIN  patient_profiles p  ON s.patient_id    = p.id
       JOIN  infusion_devices d  ON s.device_id     = d.id
       LEFT JOIN fluid_types ft  ON s.fluid_type_id = ft.id
       WHERE s.device_id = ?
       ORDER BY s.start_at DESC LIMIT 1`,
      [device.id] // ✅ lọc theo device_id thay vì patient_id cho chính xác
    );

    // 7. Đánh dấu thiết bị đang bận
    await conn.query(
      `UPDATE infusion_devices SET status = 'active' WHERE id = ?`,
      [device.id]
    );

    await conn.commit();
    res.status(201).json({
      ...newSession,
      volumeRemaining: Number(volumeInitial),
      dropRate:        Number(dropRate) || 0,
      remainingTime:   null,
      manualError:     false,
      ended:           false,
    });

  } catch (err) {
    await conn.rollback();
    console.error('[POST /api/sessions]', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// ── PATCH /api/sessions/:id/end ──────────────────────────────
app.patch('/api/sessions/:id/end', async (req, res) => {
  try {
    const [[session]] = await pool.query(
      `SELECT device_id FROM infusion_sessions WHERE id = ?`,
      [req.params.id]
    );
    if (!session) return res.status(404).json({ error: 'Khong tim thay phien' });

    await pool.query(
      `UPDATE infusion_sessions
          SET status = 'completed', end_at = NOW()
        WHERE id = ?`,
      [req.params.id]
    );
    await pool.query(
      `UPDATE infusion_devices
          SET status = 'available'
        WHERE id = ?`,
      [session.device_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/sessions/:id/end]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/sessions/:id/error ────────────────────────────
app.patch('/api/sessions/:id/error', async (req, res) => {
  try {
    // Kiểm tra phiên tồn tại
    const [[session]] = await pool.query(
      `SELECT id FROM infusion_sessions WHERE id = ?`,
      [req.params.id]
    );
    if (!session) return res.status(404).json({ error: 'Khong tim thay phien' });

    const [staffRows] = await pool.query('SELECT id FROM users LIMIT 1');
    const staffId = staffRows[0]?.id ?? null;

    await pool.query(
      `INSERT INTO infusion_issues
         (session_id, reported_by, issue_type, description, status)
       VALUES (?, ?, 'device_error', 'Loi thiet bi - bao cao thu cong', 'pending')`,
      [req.params.id, staffId]
    );
    await pool.query(
      `UPDATE infusion_sessions SET status = 'urgent' WHERE id = ?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/sessions/:id/error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/devices ─────────────────────────────────────────
app.get('/api/devices', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mac_address, location_room, location_bed, status
         FROM infusion_devices
        ORDER BY location_room, location_bed`
    );
    res.json(rows.map(d => ({
      id:     d.mac_address,
      name:   `${d.mac_address} — Phong ${d.location_room ?? '?'} Giuong ${d.location_bed ?? '?'}`,
      status: d.status,
    })));
  } catch (err) {
    console.error('[GET /api/devices]', err.message);
    res.status(500).json({ error: err.message }); // ✅ trả lỗi thật thay vì []
  }
});

// ── GET /api/alerts ──────────────────────────────────────────
app.get('/api/alerts', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         a.id,
         a.alert_type,
         a.message,
         a.is_read,
         a.triggered_at,
         p.full_name   AS patientName,
         p.room_number AS room,
         p.bed_number  AS bed
       FROM infusion_alerts a
       JOIN infusion_sessions s ON a.session_id = s.id
       JOIN patient_profiles  p ON s.patient_id = p.id
       ORDER BY a.triggered_at DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/alerts]', err.message);
    res.status(500).json({ error: err.message }); // ✅ trả lỗi thật thay vì []
  }
});

// ── PATCH /api/alerts/:id/read ───────────────────────────────
// ✅ endpoint mới — đánh dấu alert đã đọc (is_read = true trong DB)
app.patch('/api/alerts/:id/read', async (req, res) => {
  try {
    await pool.query(
      `UPDATE infusion_alerts SET is_read = TRUE WHERE id = ?`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/alerts/:id/read]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route khong ton tai: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[UNHANDLED]', err.message);
  res.status(500).json({ error: 'Loi he thong' });
});

// ── Khởi động ─────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, () =>
  console.log(`[Server] Dang chay tai http://localhost:${PORT}`)
);