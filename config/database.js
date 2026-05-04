const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_PATH || './database.sqlite',
  logging: false,
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ SQLite database connected successfully');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
  });

module.exports = sequelize;