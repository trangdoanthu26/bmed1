const { Sequelize } = require('sequelize');
require('dotenv').config();

const db = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    timezone: '+07:00',  // thêm dòng này
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  }
);

module.exports = db;