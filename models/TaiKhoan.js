const { DataTypes } = require('sequelize');
const db = require('../config/database');

const TaiKhoan = db.define('TaiKhoan', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true // Tự động tăng ID (1, 2, 3...)
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Không được tạo 2 tài khoản trùng tên
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'doctor' // Nếu không nói gì, mặc định tạo ra là Bác sĩ
    }
}, {
    tableName: 'users',
    timestamps: true // Bật cái này để biết tài khoản được tạo ngày nào
});

module.exports = TaiKhoan;