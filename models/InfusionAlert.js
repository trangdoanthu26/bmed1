const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InfusionAlert = sequelize.define('InfusionAlert', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: { type: DataTypes.CHAR(36), allowNull: false },
  alert_type: { type: DataTypes.STRING(50), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: true },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  triggered_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'infusion_alerts',
  timestamps: false
});

module.exports = InfusionAlert;