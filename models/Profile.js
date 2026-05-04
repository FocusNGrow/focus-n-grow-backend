const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Profile = sequelize.define('Profile', {
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
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  avatar_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  school_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  grade_level: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  exam_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  study_hours_per_day: {
    type: DataTypes.INTEGER,
    defaultValue: 4,
  },
  preferred_study_time: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subjects: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  goals: {
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
  tableName: 'profiles',
  timestamps: true,
});

module.exports = Profile;