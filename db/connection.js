const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'sql8.freesqldatabase.com',
    user: 'sql8823111',
    password: '4t8P6aSIIE',
    database: 'sql8823111',
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
