const https = require('https');
const crypto = require('crypto');
const urls = [
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.6.1/socket.io.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js'
];
urls.forEach(u => https.get(u, res => {
  let data = [];
  res.on('data', c => data.push(c));
  res.on('end', () => {
    const buf = Buffer.concat(data);
    const hash = crypto.createHash('sha384').update(buf).digest('base64');
    console.log(u + ' -> sha384-' + hash);
  });
}));
