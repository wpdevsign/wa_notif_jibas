# Tutorial Konfigurasi Forward SMS Gateway ke Whatsapp Gateway

## Alur

JIBAS SMS Gateway -> jbssms.outbox -> proses/trigger JIBAS -> wagw.outbox
-> Node.js queue-worker.js -> whatsapp-web.js -> WhatsApp -> wagw.sent

## Konfigurasi pengujian

Host: 127.0.0.1
Port: 3434
Database: wagw
Username: root
Password: kebersamaan
WhatsApp clientId: jibas
Interval queue: 3 detik
Nomor tes: 6285235511414

## Instalasi

Pastikan Node.js sudah terpasang di Windows.

Di CMD:

cd /d C:\jibas-wa-bridge
npm init -y
npm install whatsapp-web.js qrcode-terminal mysql2

## Autentikasi WhatsApp

Jalankan main.js yang sudah dibuat pada tutorial sebelumnya:

node main.js

Scan QR WhatsApp sampai READY. Setelah itu Ctrl+C.

Session akan tersimpan di .wwebjs_auth.

Jangan menjalankan main.js dan queue-worker.js bersamaan dengan clientId "jibas".

## Tes database

node db-test.js

Target:
[OK] Database berhasil terhubung
[OK] Query wagw.outbox berhasil

## Jalankan worker

node queue-worker.js

Tunggu:
[OK] WhatsApp berhasil diautentikasi
[WORKER] Queue worker aktif

Biarkan CMD tetap terbuka.

## Tes queue

Jalankan test-queue.sql pada MySQL/phpMyAdmin, atau:

INSERT INTO wagw.outbox
(wa_mode, wa_no, wa_text, wa_media, wa_file)
VALUES
(0, '6285235511414', 'Tes Queue JIBAS ke WhatsApp berhasil', '', '');

Worker mengambil queue, mengirim WhatsApp, menyimpan histori ke wagw.sent, lalu menghapus queue dari wagw.outbox.

## Tes dari JIBAS

Setelah tes wagw.outbox berhasil, gunakan mekanisme JIBAS sebenarnya. Contoh yang digunakan saat pengujian:

INSERT INTO jbssms.outbox
(
    DestinationNumber,
    Text
)
VALUES
(
    '6285235511414',
    'Tes JIBAS langsung ke WhatsApp'
);

Sesuaikan nama kolom jika struktur JIBAS Anda berbeda.

## Verifikasi

SELECT * FROM wagw.outbox;

Setelah sukses, queue seharusnya kosong.

SELECT *
FROM wagw.sent
ORDER BY wa_time DESC
LIMIT 10;

## Retry

Jika pengiriman gagal, queue tidak dihapus dan dicoba lagi pada siklus berikutnya.

Catatan: jika WhatsApp berhasil terkirim tetapi INSERT ke wagw.sent gagal, pesan dapat terkirim ulang pada retry berikutnya. Untuk produksi, tambahkan mekanisme idempotensi/status agar duplicate send dapat dicegah.

## Troubleshooting

Browser already running:
Hentikan main.js dengan Ctrl+C. Jalankan hanya queue-worker.js.

Pesan terkirim berulang:
Hentikan worker dan periksa error sebelum DELETE outbox.

npm.ps1 diblokir PowerShell:
Gunakan CMD atau atur Execution Policy CurrentUser:
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

## Struktur

jibas-wa-bridge/
- queue-worker.js
- db-test.js
- test-queue.sql
- README.md
- package.json / package-lock.json setelah npm install
- .wwebjs_auth/ (dibuat otomatis)
