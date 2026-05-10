const InfusionIssue = require('../models/InfusionIssue'); // Trỏ đúng tên file Model của bạn
const InfusionAlert = require('../models/InfusionAlert'); 
const { v4: uuidv4 } = require('uuid'); // Thư viện tạo mã ID ngẫu nhiên giống trong DB của bạn

exports.nhanDuLieuESP = async (req, res) => {
    try {
        // 1. Hứng dữ liệu từ mạch ESP32 gửi lên
        const { session_id, current_drop_rate, current_weight } = req.body;

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
    }
};
