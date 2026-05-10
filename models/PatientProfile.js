const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PatientProfile = sequelize.define('PatientProfile', {
  id: {
    type: DataTypes.CHAR(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  full_name: { type: DataTypes.STRING(200), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  room_number: { type: DataTypes.STRING(20), allowNull: true },
  bed_number: { type: DataTypes.STRING(20), allowNull: true }
}, {
  tableName: 'patient_profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = PatientProfile;