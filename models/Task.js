const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  id: { 
    type: DataTypes.UUID, 
    primaryKey: true, 
    defaultValue: DataTypes.UUIDV4 
  },
  user_id: { 
    type: DataTypes.UUID, 
    allowNull: false,
    // This tells the database exactly where this ID comes from
    references: {
      model: 'users', 
      key: 'id'
    }
  },
  task_name: { type: DataTypes.STRING, allowNull: false },
  is_completed: { type: DataTypes.BOOLEAN, defaultValue: false },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'tasks',
  timestamps: false 
});

module.exports = Task;