const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Streak = sequelize.define('Streak', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  current_streak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  longest_streak: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  last_study_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  total_study_days: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'streaks',
  timestamps: true,
});

module.exports = Streak;