const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MoodLog = sequelize.define('MoodLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  mood: {
    type: DataTypes.ENUM('excited', 'motivated', 'neutral', 'stressed', 'burnt_out', 'tired'),
    allowNull: false,
  },
  energy_level: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  study_time_today: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'mood_logs',
  timestamps: false,
});

module.exports = MoodLog;