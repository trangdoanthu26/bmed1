<<<<<<< HEAD
// ============================================================
// controllers/DeviceController.js
// Nhận dữ liệu từ ESP32, tính toán, lưu DB, kiểm tra cảnh báo
// ============================================================
const pool = require('../config/pool');

const TRONG_LUONG_VO_CHAI    = 30;   // gram (trọng lượng chai rỗng)
const SO_GIOT_TREN_ML        = 20;   // 20 giọt = 1 ml (dây truyền chuẩn)
const NGUONG_SAP_HET_ML      = 20;   // cảnh báo khi thể tích ≤ 20 ml
const NGUONG_LECH_TOC_DO_PCT = 0.15; // cảnh báo khi tốc độ lệch ≥ 15%
=======
const InfusionIssue = require('../models/InfusionIssue'); // Trỏ đúng tên file Model của bạn
const InfusionAlert = require('../models/InfusionAlert'); 
const { v4: uuidv4 } = require('uuid'); // Thư viện tạo mã ID ngẫu nhiên giống trong DB của bạn
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878

exports.nhanDuLieuESP = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { session_id, current_drop_rate, current_weight } = req.body;

<<<<<<< HEAD
    if (!session_id || current_drop_rate == null || current_weight == null) {
      return res.status(400).json({ error: 'Thiếu session_id, current_drop_rate hoặc current_weight' });
=======
        // --- KHỐI LOGIC 1: TÍNH TOÁN Y SINH ---
        const TRONG_LUONG_VO_CHAI = 30; // gram
        const SO_GIOT_TREN_ML = 20; // 20 giọt = 1 ml

        // Tính thể tích còn lại (ml)
        let the_tich_con_lai = current_weight - TRONG_LUONG_VO_CHAI;
        if (the_tich_con_lai < 0) the_tich_con_lai = 0; // Chống lỗi số âm khi cân bị sai lệch

        // Tính thời gian còn lại (phút)
        let thoi_gian_con_lai = 0;
        if (current_drop_rate > 0) {
            let toc_do_ml_phut = current_drop_rate / SO_GIOT_TREN_ML;
            thoi_gian_con_lai = Math.round(the_tich_con_lai / toc_do_ml_phut);
        }

        // --- KHỐI LOGIC 2: LƯU NHẬT KÝ VÀO DATABASE ---
        await InfusionIssue.create({
            id: uuidv4(), // Tự động đẻ ra cái chuỗi dài ngoằng như trong DB của bạn
            session_id: session_id,
            current_drop_rate: current_drop_rate,
            current_weight: current_weight,
            remaining_time: thoi_gian_con_lai,
            recorded_at: new Date() // Lấy giờ hệ thống hiện tại
        });

        // --- KHỐI LOGIC 3: KIỂM TRA AN TOÀN & BÁO ĐỘNG ---
        
        // Kịch bản A: Tốc độ truyền quá nhanh (Ví dụ > 60 giọt/phút)
        if (current_drop_rate > 60) {
            await CanhBao.create({
                id: uuidv4(),
                session_id: session_id,
                alert_type: 'drop_rate_high',
                message: `NGUY HIỂM: Tốc độ quá nhanh (${current_drop_rate} giọt/p)!`,
                is_read: false,
                triggered_at: new Date()
            });
        } 
        // Kịch bản B: Sắp hết dịch (Ví dụ còn dưới 20ml)
        else if (the_tich_con_lai > 0 && the_tich_con_lai < 20) {
            await CanhBao.create({
                id: uuidv4(),
                session_id: session_id,
                alert_type: 'weight_low',
                message: `CẢNH BÁO: Dịch truyền sắp hết (còn ${the_tich_con_lai} ml)!`,
                is_read: false,
                triggered_at: new Date()
            });
        }

        // 4. Trả lời lại cho ESP32 biết là đã nhận thành công
        res.status(200).json({ 
            status: "success", 
            message: "Đã lưu dữ liệu và tính toán thành công!",
            calculated_time: thoi_gian_con_lai 
        });

    } catch (error) {
        console.error("Lỗi khi xử lý dữ liệu ESP32:", error);
        res.status(500).json({ message: "Lỗi Server Node.js" });
>>>>>>> 562a4545e6c1f5d895be1406c94efb9d06763878
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