const { DataTypes } = require('sequelize');
const db = require('../config/database');

const NhatKyTruyen = db.define('NhatKyTruyen', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    // ID của phiên truyền dịch hiện tại để biết đang truyền cho ai
    session_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Tốc độ giọt mạch ESP32 đếm được gửi lên
    current_drop_rate: {
        type: DataTypes.FLOAT 
    },
    // Khối lượng thực tế cân được từ Loadcell (gram)
    current_weight: {
        type: DataTypes.FLOAT
    },
    // Cột này do code Controller của Trang tự dùng công thức tính toán rồi mới lưu vào
    remaining_time: {
        type: DataTypes.INTEGER // Tính theo phút
    },
    recorded_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'infusion_metrics_logs',
    timestamps: false 
});

module.exports = NhatKyTruyen;