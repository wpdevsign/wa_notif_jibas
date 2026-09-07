const mysql = require('mysql2/promise');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const dbConfig = {
    host: '127.0.0.1',
    port: 3434,
    user: 'root',
    password: 'kebersamaan',
    database: 'wagw'
};

const CHECK_INTERVAL = 3000;

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'jibas'
    }),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', qr => {
    console.clear();
    console.log('========================================');
    console.log('       JIBAS WHATSAPP GATEWAY');
    console.log('========================================');
    console.log('');
    console.log('SCAN QR CODE DENGAN WHATSAPP:');
    console.log('');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('');
    console.log('[OK] WhatsApp berhasil diautentikasi');
});

client.on('auth_failure', message => {
    console.log('');
    console.log('[ERROR] Authentication gagal');
    console.log(message);
});

client.on('disconnected', reason => {
    console.log('');
    console.log('[WARNING] WhatsApp terputus');
    console.log(reason);
});

client.on('ready', async () => {
    console.log('');
    console.log('========================================');
    console.log(' WhatsApp berhasil terhubung!');
    console.log(' Status : READY');
    console.log('========================================');
    startQueueWorker();
});

let workerRunning = false;

async function startQueueWorker() {
    if (workerRunning) return;
    workerRunning = true;

    console.log('');
    console.log('[WORKER] Queue worker aktif');
    console.log(
        '[WORKER] Memeriksa wagw.outbox setiap ' +
        (CHECK_INTERVAL / 1000) + ' detik'
    );
    console.log('');

    while (true) {
        try {
            await processQueue();
        } catch (error) {
            console.log('');
            console.log('[WORKER ERROR]');
            console.log(error.message);
        }
        await sleep(CHECK_INTERVAL);
    }
}

async function processQueue() {
    let connection;

    try {
        connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.query(`
            SELECT *
            FROM outbox
            ORDER BY id ASC
            LIMIT 1
        `);

        if (rows.length === 0) return;

        const row = rows[0];

        console.log('');
        console.log('----------------------------------------');
        console.log('[QUEUE] ID      : ' + row.id);
        console.log('[QUEUE] Nomor   : ' + row.wa_no);
        console.log('[QUEUE] Pesan   : ' + row.wa_text);
        console.log('----------------------------------------');

        // ========================================
// NORMALISASI NOMOR WHATSAPP INTERNASIONAL
// ========================================

let rawNumber = String(row.wa_no || '').trim();

// Hapus spasi, tanda +, tanda -, kurung, dll
let number = rawNumber.replace(/\D/g, '');

// Jika kosong
if (!number) {
    console.log('[FAILED] Nomor WhatsApp kosong: ' + rawNumber);
    return;
}

// Nomor Indonesia dengan format lokal 08xxxx
// otomatis diubah menjadi 628xxxx
if (number.startsWith('0')) {
    number = '62' + number.substring(1);
}

// Nomor yang sudah menggunakan kode negara
// akan dibiarkan apa adanya.
// Contoh:
// +628123456789 -> 628123456789
// +60123456789  -> 60123456789
// +6591234567   -> 6591234567

console.log('[NUMBER] ' + rawNumber + ' -> ' + number);

const chatId = number + '@c.us';

console.log('[SEND] Mengirim ke ' + number);
        const registered = await client.isRegisteredUser(chatId);

        if (!registered) {
            console.log('[FAILED] Nomor tidak terdaftar WhatsApp: ' + number);
            return;
        }

        await client.sendMessage(chatId, row.wa_text);

        console.log('');
        console.log('[SENT] ✓ Pesan berhasil dikirim');
        console.log('[SENT] Nomor : ' + number);

        await connection.query(
            `
            INSERT INTO sent
            (id, wa_mode, wa_no, wa_text, wa_media, wa_file, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                row.id,
                row.wa_mode,
                number,
                row.wa_text,
                row.wa_media || '',
                row.wa_file || '',
                'SENT'
            ]
        );

        console.log('[SENT] ✓ Histori tersimpan ke wagw.sent');

        await connection.query(
            `DELETE FROM outbox WHERE id = ?`,
            [row.id]
        );

        console.log(
            '[QUEUE] ID ' + row.id +
            ' berhasil dihapus dari wagw.outbox'
        );
        console.log('[QUEUE] ✓ Queue selesai diproses');

    } catch (error) {
        console.log('');
        console.log('[QUEUE ERROR]');
        console.log(error.message);
        console.log('[QUEUE] Queue tidak dihapus.');
        console.log('[QUEUE] Akan dicoba kembali pada siklus berikutnya.');
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (error) {
                console.log('[DB] Gagal menutup koneksi database');
            }
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('========================================');
console.log('       JIBAS WHATSAPP GATEWAY');
console.log('========================================');
console.log('');
console.log('Memulai WhatsApp...');

client.initialize();
