const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const ioClient = require('socket.io-client');
const axios = require('axios');

require('dotenv').config();
require('./config/db')().then(async () => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server);
  const onlineUsers = new Map();
  app.set('io', io);
  app.set('onlineUsers', onlineUsers);
  app.use(express.json());
  
  // Use actual routes
  const { authRouter } = require('./routes/auth');
  const connectionsRouter = require('./routes/connections');
  app.use('/api', authRouter);
  app.use('/api/connect', connectionsRouter);
  
  require('./sockets/chat')(io, onlineUsers);

  server.listen(4005, async () => {
    try {
      const db = 'http://127.0.0.1:4005/api';
      // Register A
      const resA = await axios.post(`${db}/register`, { username: 'test_a_' + Date.now(), password: 'password' });
      const tokenA = resA.data.token;
      const qrA = resA.data.user.qrCode;

      // Connect socket A
      const socketA = ioClient('http://127.0.0.1:4005', { auth: { token: tokenA } });
      socketA.on('connect', () => console.log('A connected'));
      socketA.on('new_connection', (data) => console.log('A RECEIVED new_connection', data));
      socketA.on('error', (err) => console.log('A error', err));
      
      await new Promise(r => setTimeout(r, 1000));

      // Register B
      const resB = await axios.post(`${db}/register`, { username: 'test_b_' + Date.now(), password: 'password' });
      const tokenB = resB.data.token;
      
      // B connects
      const resScan = await axios.post(`${db}/connect`, { targetQR: qrA }, { headers: { Authorization: `Bearer ${tokenB}` } });
      console.log('B connected response:', resScan.data);

      await new Promise(r => setTimeout(r, 2000));
      process.exit(0);
    } catch (e) {
      console.error(e.response ? e.response.data : e);
      process.exit(1);
    }
  });
});
