const { DataTypes } = require('sequelize');
const db = require('../config/database'); // Nhớ trỏ đúng đường dẫn tới file nối DB của bạn nhé

const ThietBi = db.define('ThietBi', {
    // 1. Cột ID (Chuỗi mã hóa dài)
    id: {
        type: DataTypes.STRING, 
        primaryKey: true,
    },
    // 2. Mã MAC của mạch ESP32 (Quan trọng nhất với bạn)
    mac_address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // 3. Vị trí Phòng
    location_room: {
        type: DataTypes.STRING
    },
    // 4. Vị trí Giường
    location_bed: {
        type: DataTypes.STRING
    },
    // 5. Trạng thái (đang rảnh 'available' hay đang bận 'active')
    status: {
        type: DataTypes.STRING
    },
    // 6. Thời gian tạo
    created_at: {
        type: DataTypes.DATE
    }
}, {
    // CHÌA KHÓA NẰM Ở ĐÂY: Trỏ thẳng vào tên bảng của bạn kia
    tableName: 'infusion_devices',
    timestamps: false // Tắt tự động tạo thời gian của thư viện đi vì DB đã có sẵn
});

module.exports = ThietBi;