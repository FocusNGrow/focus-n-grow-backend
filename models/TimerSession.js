const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimerSession = sequelize.define('TimerSession', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  user_id: { type: DataTypes.UUID, allowNull: false },
  duration_seconds: { type: DataTypes.INTEGER, allowNull: false },
  subject_id: { type: DataTypes.STRING },
  completed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'timer_sessions',
  timestamps: false
});

module.exports = TimerSession;