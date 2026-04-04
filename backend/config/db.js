const mongoose = require('mongoose');
const dns = require('dns');

// Fix: Node.js internal DNS resolver fails to resolve MongoDB Atlas SRV
// records on some Windows/network configurations. Using Google's public
// DNS servers as a reliable fallback.
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in the .env file");
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10 
    });
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    process.exit(1); 
  }
};

module.exports = connectDB;