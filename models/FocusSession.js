const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FocusSession = sequelize.define('FocusSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 25,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  started_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  ended_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'focus_sessions',
  timestamps: false,
});

module.exports = FocusSession;