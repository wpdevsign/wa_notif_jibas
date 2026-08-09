const mysql = require('mysql2/promise');

const db = {
    host: '127.0.0.1',
    port: 3434,
    user: 'root',
    password: 'kebersamaan',
    database: 'wagw'
};

async function testDatabase() {
    let connection;

    try {
        console.log('========================================');
        console.log('       TEST DATABASE JIBAS');
        console.log('========================================');
        console.log('');
        console.log('[INFO] Menghubungkan ke database...');
        console.log('[INFO] Host     : ' + db.host);
        console.log('[INFO] Port     : ' + db.port);
        console.log('[INFO] Database : ' + db.database);
        console.log('');

        connection = await mysql.createConnection(db);

        console.log('[OK] Database berhasil terhubung');

        const [rows] = await connection.query(`
            SELECT * FROM outbox
            ORDER BY id ASC
            LIMIT 10
        `);

        console.log('');
        console.log('[OK] Query wagw.outbox berhasil');
        console.log('[INFO] Jumlah queue: ' + rows.length);
        console.log('');

        if (rows.length > 0) {
            console.table(rows);
        } else {
            console.log('[INFO] wagw.outbox sedang kosong');
        }
    } catch (error) {
        console.log('');
        console.log('[ERROR] Database gagal diakses');
        console.log('[ERROR] ' + error.message);
    } finally {
        if (connection) await connection.end();
    }
}

testDatabase();
