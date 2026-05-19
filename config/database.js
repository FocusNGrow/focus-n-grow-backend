const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },
});

sequelize.authenticate()
  .then(() => {
    console.log('✅ Supabase PostgreSQL connected successfully');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
  });

module.exports = sequelize;