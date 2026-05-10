// ============================================================
// controllers/DeviceController.js
// Nhận dữ liệu từ ESP32, tính toán, lưu DB, kiểm tra cảnh báo
// ============================================================
const pool = require('../config/pool');

const TRONG_LUONG_VO_CHAI    = 30;   // gram (trọng lượng chai rỗng)
const SO_GIOT_TREN_ML        = 20;   // 20 giọt = 1 ml (dây truyền chuẩn)
const NGUONG_SAP_HET_ML      = 20;   // cảnh báo khi thể tích ≤ 20 ml
const NGUONG_LECH_TOC_DO_PCT = 0.15; // cảnh báo khi tốc độ lệch ≥ 15%

exports.nhanDuLieuESP = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { session_id, current_drop_rate, current_weight } = req.body;

    if (!session_id || current_drop_rate == null || current_weight == null) {
      return res.status(400).json({ error: 'Thiếu session_id, current_drop_rate hoặc current_weight' });
    }

    // 1. Lấy phiên — cần prescribed_drop_rate để so sánh tốc độ
    const [[session]] = await conn.query(
      `SELECT id, prescribed_drop_rate, status
         FROM infusion_sessions
        WHERE id = ? AND status != 'completed'
        LIMIT 1`,
      [session_id]
    );
    if (!session) {
      return res.status(404).json({ error: `Không tìm thấy phiên: ${session_id}` });
    }

    // 2. Tính toán y sinh
    const dropRate = parseFloat(current_drop_rate);
    const weight   = parseFloat(current_weight);

    let the_tich_con_lai = weight - TRONG_LUONG_VO_CHAI;
    if (the_tich_con_lai < 0) the_tich_con_lai = 0;

    let thoi_gian_con_lai = 0;
    if (dropRate > 0) {
      thoi_gian_con_lai = Math.round(the_tich_con_lai / (dropRate / SO_GIOT_TREN_ML));
    }

    // 3. Lưu nhật ký
    await conn.query(
      `INSERT INTO infusion_metrics_logs
         (session_id, current_drop_rate, current_weight, remaining_time, recorded_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [session_id, dropRate, weight, thoi_gian_con_lai]
    );

    // 4. Kiểm tra cảnh báo
    let newStatus = session.status;

    // Cảnh báo A: Sắp hết dịch (≤ 20 ml)
    if (the_tich_con_lai > 0 && the_tich_con_lai <= NGUONG_SAP_HET_ML) {
      await conn.query(
        `INSERT INTO infusion_alerts (session_id, alert_type, message, is_read, triggered_at)
         VALUES (?, 'sap_het', ?, FALSE, NOW())`,
        [session_id, `CẢNH BÁO: Dịch sắp hết — còn ${the_tich_con_lai.toFixed(1)} ml`]
      );
      if (newStatus === 'normal') newStatus = 'warning';
    }

    // Cảnh báo B: Lệch tốc độ ≥ 15% so với y lệnh
    const prescribedRate = parseFloat(session.prescribed_drop_rate);
    if (prescribedRate > 0 && dropRate > 0) {
      const lech = Math.abs(dropRate - prescribedRate) / prescribedRate;
      if (lech >= NGUONG_LECH_TOC_DO_PCT) {
        const huong = dropRate > prescribedRate ? 'nhanh hơn' : 'chậm hơn';
        await conn.query(
          `INSERT INTO infusion_alerts (session_id, alert_type, message, is_read, triggered_at)
           VALUES (?, 'loi_toc_do', ?, FALSE, NOW())`,
          [session_id,
           `LỖI PHIÊN TRUYỀN: Tốc độ ${huong} ${(lech * 100).toFixed(1)}% ` +
           `(đo: ${dropRate} giọt/phút, y lệnh: ${prescribedRate} giọt/phút)`]
        );
        newStatus = 'urgent';
      }
    }

    if (newStatus !== session.status) {
      await conn.query(
        `UPDATE infusion_sessions SET status = ? WHERE id = ?`,
        [newStatus, session_id]
      );
    }

    res.status(200).json({ status: 'success', the_tich_con_lai, thoi_gian_con_lai });

  } catch (err) {
    console.error('[DeviceController]', err.message);
    res.status(500).json({ error: 'Lỗi server' });
  } finally {
    conn.release();
  }
};