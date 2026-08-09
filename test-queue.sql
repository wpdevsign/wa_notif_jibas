-- Tes queue langsung ke wagw.outbox
INSERT INTO wagw.outbox
(
    wa_mode,
    wa_no,
    wa_text,
    wa_media,
    wa_file
)
VALUES
(
    0,
    '6285235511414',
    'Tes Queue JIBAS ke WhatsApp berhasil',
    '',
    ''
);

-- Cek queue setelah worker memproses
SELECT * FROM wagw.outbox;

-- Cek histori pengiriman
SELECT *
FROM wagw.sent
ORDER BY wa_time DESC
LIMIT 10;
