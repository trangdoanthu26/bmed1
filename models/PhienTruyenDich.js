const { DataTypes } = require('sequelize');
const db = require('../config/database');

const PhienTruyenDich = db.define('PhienTruyenDich', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    loai_dich: {
        type: DataTypes.STRING,
        allowNull: false // Ví dụ: Nước biển, Đạm...
    },
    the_tich_tong: {
        type: DataTypes.INTEGER, // Đơn vị: ml (ví dụ: 500)
        allowNull: false
    },
    trang_thai: {
        type: DataTypes.STRING,
        defaultValue: 'Đang truyền' // Có thể là: Đang truyền, Cảnh báo, Đã xong
    }
}, {
    tableName: 'infusion_sessions',
    timestamps: true // Tự động ghi lại thời gian bắt đầu truyền (createdAt)
});

module.exports = PhienTruyenDich;