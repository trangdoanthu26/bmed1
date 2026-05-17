const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InfusionIssue = sequelize.define('InfusionIssue', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  session_id: { type: DataTypes.CHAR(36), allowNull: false },
  reported_by: { type: DataTypes.CHAR(36), allowNull: false },
  issue_type: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'investigating', 'resolved'),
    defaultValue: 'pending'
  },
  reported_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'infusion_issues',
  timestamps: false
});

module.exports = InfusionIssue;