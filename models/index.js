const sequelize = require('../config/database');

const User               = require('./User');
const PatientProfile     = require('./PatientProfile');
const InfusionDevice     = require('./InfusionDevice');
const FluidType          = require('./FluidType');
const InfusionSession    = require('./InfusionSession');
const InfusionMetricsLog = require('./InfusionMetricsLog');
const InfusionIssue      = require('./InfusionIssue');
const InfusionAlert      = require('./InfusionAlert');

// --- Associations ---
InfusionSession.belongsTo(InfusionDevice,   { foreignKey: 'device_id' });
InfusionSession.belongsTo(PatientProfile,   { foreignKey: 'patient_id' });
InfusionSession.belongsTo(User,             { foreignKey: 'staff_id' });
InfusionSession.belongsTo(FluidType,        { foreignKey: 'fluid_type_id' });

InfusionMetricsLog.belongsTo(InfusionSession, { foreignKey: 'session_id' });
InfusionIssue.belongsTo(InfusionSession,      { foreignKey: 'session_id' });
InfusionIssue.belongsTo(User,                 { foreignKey: 'reported_by' });
InfusionAlert.belongsTo(InfusionSession,      { foreignKey: 'session_id' });

module.exports = {
  sequelize,
  User,
  PatientProfile,
  InfusionDevice,
  FluidType,
  InfusionSession,
  InfusionMetricsLog,
  InfusionIssue,
  InfusionAlert
};