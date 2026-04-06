require('dotenv').config();
require('./config/db')().then(async () => { 
  const User = require('./models/User'); 
  const mongoose = require('mongoose'); 
  const u = new User({username: 'test' + Date.now(), password: '123', connections: [new mongoose.Types.ObjectId()]}); 
  console.log(u.connections.includes(new mongoose.Types.ObjectId(u.connections[0]))); 
  process.exit(0); 
})
