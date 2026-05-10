'use strict';
const express = require('express');
const cors    = require('cors');
require('dotenv').config();

<<<<<<< HEAD
const app  = express();
const pool = require('./config/pool');
=======
const app = express();
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
<<<<<<< HEAD
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  methods:     ['GET','POST','PATCH','DELETE','OPTIONS'],
=======
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
  credentials: true,
}));
app.use(express.json());

<<<<<<< HEAD
// ── Kiểm tra DB khi khởi động ────────────────────────────────
=======
// ── Pool MySQL2 (khai báo thẳng, không qua config/pool.js) ──
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:    Number(    process.env.DB_PORT)     || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'infusion_monitoring',
  waitForConnections: true,
  connectionLimit:    10,
  timezone:           '+07:00',
});

// Kiểm tra kết nối ngay khi khởi động
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
pool.getConnection()
  .then(c => { console.log('[DB] Ket noi MySQL thanh cong!'); c.release(); })
  .catch(e => { console.error('[DB] Loi ket noi MySQL:', e.message); process.exit(1); });

<<<<<<< HEAD
// ── ESP32 route ───────────────────────────────────────────────
app.use('/api', require('./routes/deviceRoutes'));
=======
// ── Routes ESP32 (giữ nguyên — DeviceController dùng Sequelize riêng) ──
const deviceRoutes = require('./routes/deviceRoutes');
app.use('/', deviceRoutes);
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── GET /api/sessions ─────────────────────────────────────────
app.get('/api/sessions', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id,
<<<<<<< HEAD
        p.full_name        AS patientName,
        p.room_number      AS room,
        p.bed_number       AS bed,
        d.mac_address      AS deviceId,
        ft.name            AS fluidType,
        s.initial_weight   AS volumeInitial,
        s.prescribed_drop_rate AS prescribedDropRate,
        s.status,
        s.start_at         AS createdAt,
        (SELECT m.current_drop_rate FROM infusion_metrics_logs m
          WHERE m.session_id = s.id ORDER BY m.recorded_at DESC LIMIT 1) AS dropRate,
        (SELECT m.current_weight    FROM infusion_metrics_logs m
          WHERE m.session_id = s.id ORDER BY m.recorded_at DESC LIMIT 1) AS volumeRemaining,
        (SELECT m.remaining_time    FROM infusion_metrics_logs m
          WHERE m.session_id = s.id ORDER BY m.recorded_at DESC LIMIT 1) AS remainingTime,
        EXISTS(SELECT 1 FROM infusion_issues i
          WHERE i.session_id = s.id AND i.status != 'resolved') AS manualError
      FROM infusion_sessions s
      JOIN  patient_profiles p  ON s.patient_id    = p.id
      JOIN  infusion_devices d  ON s.device_id     = d.id
      LEFT JOIN fluid_types  ft ON s.fluid_type_id = ft.id
=======
        p.full_name                          AS patientName,
        p.room_number                        AS room,
        p.bed_number                         AS bed,
        d.mac_address                        AS deviceId,
        ft.name                              AS fluidType,
        s.initial_weight                     AS volumeInitial,
        s.status,
        s.start_at                           AS createdAt,
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
          WHERE i.session_id = s.id AND i.status != 'resolved'
        ) AS manualError
      FROM infusion_sessions s
      JOIN patient_profiles p  ON s.patient_id    = p.id
      JOIN infusion_devices d  ON s.device_id     = d.id
      LEFT JOIN fluid_types ft ON s.fluid_type_id = ft.id
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
      WHERE s.status != 'completed'
      ORDER BY s.start_at DESC
    `);
    res.json(rows.map(r => ({
      ...r,
      volumeRemaining:    r.volumeRemaining ?? r.volumeInitial,
      dropRate:           r.dropRate        ?? 0,
      prescribedDropRate: r.prescribedDropRate ?? 0,
      remainingTime:      r.remainingTime   ?? null,
      manualError:        Boolean(r.manualError),
    })));
  } catch (e) {
    console.error('[GET /api/sessions]', e.message);
    res.status(500).json({ error: e.message });
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
<<<<<<< HEAD
  } catch (e) {
    console.error('[GET /metrics]', e.message);
    res.status(500).json({ error: e.message });
=======
  } catch (err) {
    console.error('[GET /metrics]', err.message);
    res.status(500).json({ error: err.message });
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
  }
});

// ── POST /api/sessions ────────────────────────────────────────
app.post('/api/sessions', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

<<<<<<< HEAD
    const { patientName, age, room, bed, condition,
            deviceId, fluidType, volumeInitial, dropRate, doctor } = req.body;

    if (!patientName || !deviceId || !volumeInitial || !dropRate) {
      await conn.rollback();
      return res.status(400).json({ error: 'Thiếu: patientName, deviceId, volumeInitial, dropRate' });
=======
    const { patientName, room, bed, condition,
            deviceId, fluidType, volumeInitial, dropRate, doctor } = req.body;

    if (!patientName || !deviceId || !volumeInitial) {
      await conn.rollback();
      return res.status(400).json({ error: 'Thieu: patientName, deviceId, volumeInitial' });
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
    }

    // 1. Tìm hoặc tạo bệnh nhân
    let patientId;
    const [existing] = await conn.query(
<<<<<<< HEAD
      `SELECT id FROM patient_profiles WHERE full_name=? AND room_number=? AND bed_number=? LIMIT 1`,
=======
      `SELECT id FROM patient_profiles
       WHERE full_name=? AND room_number=? AND bed_number=? LIMIT 1`,
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
      [patientName, room ?? null, bed ?? null]
    );
    if (existing.length > 0) {
      patientId = existing[0].id;
    } else {
      await conn.query(
        `INSERT INTO patient_profiles (full_name, room_number, bed_number) VALUES (?,?,?)`,
        [patientName, room ?? null, bed ?? null]
      );
      const [[np]] = await conn.query(
<<<<<<< HEAD
        `SELECT id FROM patient_profiles WHERE full_name=? ORDER BY created_at DESC LIMIT 1`,
=======
        `SELECT id FROM patient_profiles
         WHERE full_name=? ORDER BY created_at DESC LIMIT 1`,
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
        [patientName]
      );
      patientId = np.id;
    }

    // 2. Kiểm tra thiết bị
    const [[device]] = await conn.query(
      `SELECT id, status FROM infusion_devices WHERE mac_address=? LIMIT 1`,
      [deviceId]
    );
    if (!device) {
      await conn.rollback();
      return res.status(404).json({ error: `Không tìm thấy thiết bị: ${deviceId}` });
    }
    if (device.status === 'active') {
      await conn.rollback();
      return res.status(409).json({ error: 'Thiết bị đang có phiên truyền khác.' });
    }

    // 3. Tìm loại dịch
    let fluidTypeId = null;
    if (fluidType) {
      const [fts] = await conn.query(
        `SELECT id FROM fluid_types WHERE name LIKE ? LIMIT 1`, [`%${fluidType}%`]
      );
      if (fts.length > 0) fluidTypeId = fts[0].id;
    }

<<<<<<< HEAD
    // 4. Lấy staff (tạm — sau thay bằng JWT)
=======
    // 4. Lấy staff
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
    const [staffRows] = await conn.query('SELECT id FROM users LIMIT 1');
    if (!staffRows.length) {
      await conn.rollback();
      return res.status(500).json({ error: 'Chưa có user trong DB.' });
    }

<<<<<<< HEAD
    // 5. Tạo phiên — lưu prescribed_drop_rate để so sánh sau
    await conn.query(
      `INSERT INTO infusion_sessions
         (device_id, patient_id, staff_id, fluid_type_id,
          initial_weight, prescribed_drop_rate, status)
       VALUES (?,?,?,?,?,?,'normal')`,
      [device.id, patientId, staffRows[0].id, fluidTypeId,
       Number(volumeInitial), Number(dropRate)]
=======
    // 5. Tạo phiên
    await conn.query(
      `INSERT INTO infusion_sessions
         (device_id, patient_id, staff_id, fluid_type_id, initial_weight, status)
       VALUES (?,?,?,?,?,'normal')`,
      [device.id, patientId, staffId, fluidTypeId, volumeInitial]
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
    );

    // 6. Lấy phiên vừa tạo
    const [[newSession]] = await conn.query(
      `SELECT s.id, p.full_name AS patientName, p.room_number AS room,
              p.bed_number AS bed, d.mac_address AS deviceId,
              ft.name AS fluidType, s.initial_weight AS volumeInitial,
<<<<<<< HEAD
              s.prescribed_drop_rate AS prescribedDropRate,
=======
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
              s.status, s.start_at AS createdAt
       FROM infusion_sessions s
       JOIN patient_profiles p  ON s.patient_id    = p.id
       JOIN infusion_devices d  ON s.device_id     = d.id
       LEFT JOIN fluid_types ft ON s.fluid_type_id = ft.id
<<<<<<< HEAD
       WHERE s.device_id=? ORDER BY s.start_at DESC LIMIT 1`,
=======
       WHERE s.patient_id=? ORDER BY s.start_at DESC LIMIT 1`,
      [patientId]
    );

    // 7. Đánh dấu thiết bị bận
    await conn.query(
      `UPDATE infusion_devices SET status='active' WHERE id=?`,
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
      [device.id]
    );

    // 7. Đánh dấu thiết bị bận
    await conn.query(`UPDATE infusion_devices SET status='active' WHERE id=?`, [device.id]);

    await conn.commit();
    res.status(201).json({
      ...newSession,
<<<<<<< HEAD
      volumeRemaining:    Number(volumeInitial),
      dropRate:           Number(dropRate),
      prescribedDropRate: Number(dropRate),
      manualError:        false,
=======
      volumeRemaining: Number(volumeInitial),
      dropRate:        Number(dropRate) || 0,
      manualError:     false,
      ended:           false,
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
    });
  } catch (e) {
    await conn.rollback();
<<<<<<< HEAD
    console.error('[POST /api/sessions]', e.message);
    res.status(500).json({ error: e.message });
=======
    console.error('[POST /api/sessions] LOI:', err.message);
    res.status(500).json({ error: err.message });
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
  } finally {
    conn.release();
  }
});

// ── PATCH /api/sessions/:id/end ──────────────────────────────
app.patch('/api/sessions/:id/end', async (req, res) => {
  try {
    const [[s]] = await pool.query(
<<<<<<< HEAD
      'SELECT device_id FROM infusion_sessions WHERE id=?', [req.params.id]
    );
    if (!s) return res.status(404).json({ error: 'Không tìm thấy phiên' });
=======
      'SELECT device_id FROM infusion_sessions WHERE id=?',
      [req.params.id]
    );
    if (!s) return res.status(404).json({ error: 'Khong tim thay phien' });
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878

    await pool.query(
      `UPDATE infusion_sessions SET status='completed', end_at=NOW() WHERE id=?`,
      [req.params.id]
    );
    await pool.query(
<<<<<<< HEAD
      `UPDATE infusion_devices SET status='available' WHERE id=?`, [s.device_id]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('[PATCH /end]', e.message);
    res.status(500).json({ error: e.message });
=======
      `UPDATE infusion_devices SET status='available' WHERE id=?`,
      [s.device_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /end]', err.message);
    res.status(500).json({ error: err.message });
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
  }
});

// ── PATCH /api/sessions/:id/error ────────────────────────────
app.patch('/api/sessions/:id/error', async (req, res) => {
  try {
    const [staffRows] = await pool.query('SELECT id FROM users LIMIT 1');
    const staffId = staffRows[0]?.id ?? null;

    await pool.query(
      `INSERT INTO infusion_issues
         (session_id, reported_by, issue_type, description, status)
<<<<<<< HEAD
       VALUES (?,'${staffId}','device_error','Lỗi thiết bị - báo cáo thủ công','pending')`,
=======
       VALUES (?, ?, 'device_error', 'Loi thiet bi - bao cao thu cong', 'pending')`,
      [req.params.id, staffId]
    );
    await pool.query(
      `UPDATE infusion_sessions SET status='urgent' WHERE id=?`,
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
      [req.params.id]
    );
    await pool.query(
      `UPDATE infusion_sessions SET status='urgent' WHERE id=?`, [req.params.id]
    );
    res.json({ success: true });
<<<<<<< HEAD
  } catch (e) {
    console.error('[PATCH /error]', e.message);
    res.status(500).json({ error: e.message });
=======
  } catch (err) {
    console.error('[PATCH /error]', err.message);
    res.status(500).json({ error: err.message });
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
  }
});

// ── GET /api/devices ──────────────────────────────────────────
app.get('/api/devices', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mac_address, location_room, location_bed, status
<<<<<<< HEAD
         FROM infusion_devices ORDER BY location_room, location_bed`
=======
       FROM infusion_devices
       ORDER BY location_room, location_bed`
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
    );
    res.json(rows.map(d => ({
      id:     d.mac_address,
      name:   `${d.mac_address} — Phòng ${d.location_room ?? '?'} Giường ${d.location_bed ?? '?'}`,
      status: d.status,
    })));
<<<<<<< HEAD
  } catch (e) {
    console.error('[GET /api/devices]', e.message);
    res.status(500).json({ error: e.message });
=======
  } catch (err) {
    console.error('[GET /api/devices]', err.message);
    res.json([]);
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
  }
});

// ── GET /api/alerts ───────────────────────────────────────────
app.get('/api/alerts', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, a.alert_type, a.message, a.is_read, a.triggered_at,
              p.full_name AS patientName, p.room_number AS room, p.bed_number AS bed
       FROM infusion_alerts a
       JOIN infusion_sessions s ON a.session_id = s.id
       JOIN patient_profiles  p ON s.patient_id = p.id
       ORDER BY a.triggered_at DESC LIMIT 50`
    );
    res.json(rows);
<<<<<<< HEAD
  } catch (e) {
    console.error('[GET /api/alerts]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── PATCH /api/alerts/:id/read ────────────────────────────────
app.patch('/api/alerts/:id/read', async (req, res) => {
  try {
    await pool.query(`UPDATE infusion_alerts SET is_read=TRUE WHERE id=?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── 404 & error handler ───────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: `Route không tồn tại: ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));

=======
  } catch (err) {
    console.error('[GET /api/alerts]', err.message);
    res.json([]);
  }
});

>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
// ── Khởi động ─────────────────────────────────────────────────
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`[Server] Dang chay tai http://localhost:${PORT}`));