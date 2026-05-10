const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InfusionMetricsLog = sequelize.define('InfusionMetricsLog', {
  id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
  session_id: { type: DataTypes.CHAR(36), allowNull: false },
  current_drop_rate: { type: DataTypes.INTEGER, allowNull: false },
  current_weight: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  remaining_time: { type: DataTypes.INTEGER, allowNull: true },
  recorded_at: { type: DataTypes.DATE(3), defaultValue: DataTypes.NOW }
}, {
  tableName: 'infusion_metrics_logs',
  timestamps: false
});

module.exports = InfusionMetricsLog;
