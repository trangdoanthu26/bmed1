const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InfusionSession = sequelize.define('InfusionSession', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  device_id: { type: DataTypes.CHAR(36), allowNull: false },
  patient_id: { type: DataTypes.CHAR(36), allowNull: false },
  staff_id: { type: DataTypes.CHAR(36), allowNull: false },
  fluid_type_id: { type: DataTypes.CHAR(36), allowNull: true },
  initial_weight: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM('normal', 'warning', 'urgent', 'completed'),
    defaultValue: 'normal'
  },
  start_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  end_at: { type: DataTypes.DATE, allowNull: true }
}, {
  tableName: 'infusion_sessions',
  timestamps: false
});

module.exports = InfusionSession;