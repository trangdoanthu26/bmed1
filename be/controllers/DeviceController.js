// controllers/DeviceController.js
// ============================================================
// Xử lý dữ liệu từ ESP32 với bộ đệm trung bình trượt 10 lượt
// ESP32 gửi mỗi 5 giây → sau 10 lượt (50 giây) mới ra quyết định
// ============================================================
const pool = require('../config/pool');

const TRONG_LUONG_VO_CHAI    = 30;   // gram
const SO_GIOT_TREN_ML        = 20;   // giọt/ml
const NGUONG_SAP_HET_ML      = 20;   // ml
const NGUONG_LECH_TOC_DO_PCT = 0.15; // 15%
const BUFFER_SIZE            = 10;   // số lượt gửi trước khi ra quyết định

// Bộ đệm in-memory: Map<session_id, { samples: [] }>
const sessionBuffer = new Map();

function getBuffer(sessionId) {
  if (!sessionBuffer.has(sessionId)) {
    sessionBuffer.set(sessionId, { samples: [] });
  }
  return sessionBuffer.get(sessionId);
}

function clearBuffer(sessionId) {
  sessionBuffer.set(sessionId, { samples: [] });
}

// ── POST /du-lieu-esp ──────────────────────────────────────────────────────
// ESP32 gửi: { mac_address, current_drop_rate, current_weight }
// HOẶC (compat cũ): { session_id, current_drop_rate, current_weight }
exports.nhanDuLieuESP = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    let { session_id, mac_address, current_drop_rate, current_weight } = req.body;

    if (current_drop_rate == null || current_weight == null) {
      return res.status(400).json({ error: 'Thiếu current_drop_rate hoặc current_weight' });
    }

    // Nếu gửi mac_address → tìm session đang active
    if (!session_id && mac_address) {
      const [[device]] = await conn.query(
        'SELECT id FROM infusion_devices WHERE mac_address = ? LIMIT 1',
        [mac_address]
      );
      if (!device) {
        conn.release();
        return res.status(404).json({ error: 'Không tìm thấy thiết bị MAC: ' + mac_address });
      }
      const [[activeSession]] = await conn.query(
        "SELECT id FROM infusion_sessions WHERE device_id = ? AND status != 'completed' ORDER BY start_at DESC LIMIT 1",
        [device.id]
      );
      if (!activeSession) {
        conn.release();
        return res.status(200).json({ status: 'no_active_session' });
      }
      session_id = activeSession.id;
    }

    if (!session_id) {
      conn.release();
      return res.status(400).json({ error: 'Thiếu session_id hoặc mac_address' });
    }

    const [[session]] = await conn.query(
      "SELECT id, prescribed_drop_rate, initial_weight, status FROM infusion_sessions WHERE id = ? AND status != 'completed' LIMIT 1",
      [session_id]
    );
    if (!session) {
      clearBuffer(session_id);
      conn.release();
      return res.status(404).json({ error: 'Không tìm thấy phiên: ' + session_id });
    }

    const dropRate = parseFloat(current_drop_rate);
    const weight   = parseFloat(current_weight);

    let the_tich_con_lai = weight - TRONG_LUONG_VO_CHAI;
    if (the_tich_con_lai < 0) the_tich_con_lai = 0;

    let thoi_gian_con_lai = 0;
    if (dropRate > 0) {
      const ml_per_min = dropRate / SO_GIOT_TREN_ML;
      thoi_gian_con_lai = Math.round(the_tich_con_lai / ml_per_min);
    }

    // Lưu log mỗi lần gửi
    await conn.query(
      'INSERT INTO infusion_metrics_logs (session_id, current_drop_rate, current_weight, remaining_time, recorded_at) VALUES (?, ?, ?, ?, NOW())',
      [session_id, dropRate, weight, thoi_gian_con_lai]
    );

    // Đẩy vào bộ đệm
    const buf = getBuffer(session_id);
    buf.samples.push({ dropRate, weight, the_tich_con_lai });

    // Chưa đủ 10 lượt → trả về ngay
    if (buf.samples.length < BUFFER_SIZE) {
      conn.release();
      return res.status(200).json({
        status: 'buffering',
        buffer_count: buf.samples.length,
        buffer_needed: BUFFER_SIZE,
        the_tich_con_lai,
        thoi_gian_con_lai,
      });
    }

    // Đủ 10 lượt → tính trung bình và ra quyết định
    const avgDropRate = buf.samples.reduce((s, x) => s + x.dropRate, 0) / BUFFER_SIZE;
    const avgVolume   = buf.samples.reduce((s, x) => s + x.the_tich_con_lai, 0) / BUFFER_SIZE;

    // Xoá bộ đệm để đo 10 lượt tiếp theo
    clearBuffer(session_id);

    let newStatus = session.status;

    // Cảnh báo 1: Sắp hết dịch
    if (avgVolume > 0 && avgVolume <= NGUONG_SAP_HET_ML) {
      const [[existAlert]] = await conn.query(
        "SELECT id FROM infusion_alerts WHERE session_id = ? AND alert_type = 'sap_het' AND is_read = 0 AND handled_at IS NULL LIMIT 1",
        [session_id]
      );
      if (!existAlert) {
        await conn.query(
          "INSERT INTO infusion_alerts (session_id, alert_type, message, is_read, triggered_at) VALUES (?, 'sap_het', ?, FALSE, NOW())",
          [session_id, 'CẢNH BÁO: Dịch sắp hết — còn ' + avgVolume.toFixed(1) + ' ml']
        );
      }
      if (newStatus === 'normal') newStatus = 'warning';
    }

    // Cảnh báo 2: Tốc độ bất thường
    const prescribedRate = parseFloat(session.prescribed_drop_rate || 0);
    if (prescribedRate > 0 && avgDropRate > 0) {
      const lech = Math.abs(avgDropRate - prescribedRate) / prescribedRate;
      if (lech >= NGUONG_LECH_TOC_DO_PCT) {
        const [[existAlert]] = await conn.query(
          "SELECT id FROM infusion_alerts WHERE session_id = ? AND alert_type = 'loi_toc_do' AND is_read = 0 AND handled_at IS NULL LIMIT 1",
          [session_id]
        );
        if (!existAlert) {
          const huong = avgDropRate > prescribedRate ? 'nhanh hơn' : 'chậm hơn';
          await conn.query(
            "INSERT INTO infusion_alerts (session_id, alert_type, message, is_read, triggered_at) VALUES (?, 'loi_toc_do', ?, FALSE, NOW())",
            [session_id,
             'LỖI TỐC ĐỘ: Tốc độ TB (50s) ' + huong + ' ' + (lech*100).toFixed(1) + '% ' +
             '(đo TB: ' + avgDropRate.toFixed(1) + ' giot/phut, y lenh: ' + prescribedRate + ' giot/phut)']
          );
        }
        newStatus = 'urgent';
      }
    }

    if (newStatus !== session.status) {
      await conn.query('UPDATE infusion_sessions SET status = ? WHERE id = ?', [newStatus, session_id]);
    }

    res.status(200).json({
      status: 'decided',
      avg_drop_rate:  +avgDropRate.toFixed(2),
      avg_volume_ml:  +avgVolume.toFixed(2),
      thoi_gian_con_lai,
      session_status: newStatus,
    });

  } catch (err) {
    console.error('[DeviceController.nhanDuLieuESP]', err.message);
    res.status(500).json({ error: 'Loi server: ' + err.message });
  } finally {
    conn.release();
  }
};

exports.clearSessionBuffer = clearBuffer;

