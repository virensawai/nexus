const io = require('socket.io-client');
const axios = require('axios');
const API = 'http://127.0.0.1:4000/api';

async function test() {
  try {
    // 1. Register User A
    const resA = await axios.post(`${API}/register`, { username: 'userA_' + Date.now(), password: 'password' });
    const tokenA = resA.data.token;
    const qrA = resA.data.user.qrCode;

    // 2. Connect Socket for User A
    const socketA = io('http://127.0.0.1:4000', { auth: { token: tokenA } });
    
    socketA.on('connect', () => console.log('A connected'));
    socketA.on('new_connection', (data) => console.log('A received new_connection:', data));

    await new Promise(r => setTimeout(r, 1000)); // wait for connect

    // 3. Register User B
    const resB = await axios.post(`${API}/register`, { username: 'userB_' + Date.now(), password: 'password' });
    const tokenB = resB.data.token;

    // 4. B scans A
    console.log('B scanning A with qrCode:', qrA);
    const resScan = await axios.post(`${API}/connect`, { targetQR: qrA }, { headers: { Authorization: `Bearer ${tokenB}` }});
    console.log('B connect response:', resScan.data);

    await new Promise(r => setTimeout(r, 2000)); // wait for socket event
    process.exit(0);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
    process.exit(1);
  }
}
test();
