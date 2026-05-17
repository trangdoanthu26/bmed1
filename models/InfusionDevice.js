const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InfusionDevice = sequelize.define('InfusionDevice', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  mac_address: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  location_room: { type: DataTypes.STRING(50), allowNull: true },
  location_bed: { type: DataTypes.STRING(50), allowNull: true },
  status: {
    type: DataTypes.ENUM('available', 'active', 'error', 'unassigned'),
    defaultValue: 'unassigned'
  }
}, {
  tableName: 'infusion_devices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = InfusionDevice;