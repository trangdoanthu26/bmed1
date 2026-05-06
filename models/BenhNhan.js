//Khai báo bảng bệnh nhân có thông tin gì
const { DataTypes } = require('sequelize');
const db = require('../config/database'); // Gọi đường ống kết nối ra

// Khai báo khuôn (Model) cho Bệnh Nhân
const BenhNhan = db.define('BenhNhan', {
    ma_bn: {
        type: DataTypes.STRING,
        primaryKey: true, // Đây là Khóa chính (Căn cước của bệnh nhân)
        allowNull: false
    },
    ten_benh_nhan: {
        type: DataTypes.STRING,
        allowNull: false // Bắt buộc phải có tên
    },
    tuoi: {
        type: DataTypes.INTEGER
    },
    so_giuong: {
        type: DataTypes.STRING
    }
}, {
    tableName: 'patient_profiles', // Tên bảng dưới MySQL
    timestamps: false       // Tắt tính năng tự động ghi giờ tạo
});

module.exports = BenhNhan;