const { DataTypes } = require('sequelize');
const db = require('../config/database');

const CanhBao = db.define('CanhBao', {
    id: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    session_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // Phân loại lỗi (Ví dụ: 'drop_rate_high', 'weight_low')
    alert_type: {
        type: DataTypes.STRING
    },
    // Câu thông báo chi tiết để hiển thị lên Web cho y tá đọc
    message: {
        type: DataTypes.STRING
    },
    // Đánh dấu y tá đã ấn nút "Đã xem" trên màn hình hay chưa (0 là chưa, 1 là rồi)
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    triggered_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'infusion_alerts',
    timestamps: false
});

module.exports = CanhBao;