const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BiblePlan = sequelize.define('BiblePlan', {
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
  current_day: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  total_days: {
    type: DataTypes.INTEGER,
    defaultValue: 365,
  },
  last_read_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  completed_days: {
    type: DataTypes.TEXT,
    defaultValue: '[]',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  tableName: 'bible_plans',
  timestamps: true,
});

module.exports = BiblePlan;