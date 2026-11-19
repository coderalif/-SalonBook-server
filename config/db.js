// ==========================================
// Database Connection Configuration (MongoDB)
// Serverless-ready cached connection
// ==========================================

const mongoose = require('mongoose');
const dns = require('dns');

// Windows ও স্থানীয় নেটওয়ার্কে MongoDB Atlas SRV DNS সমাধান
try {
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
    // যেসব পরিবেশে setServers সীমাবদ্ধ সেখানে ডিফল্ট চলবে
}

let isConnected = false;

// MongoDB-তে কানেক্ট করার ফাংশন (Serverless Cached Connection)
const connectDB = async () => {
    // যদি ইতোমধ্যে কানেক্টেড থাকে
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    try {
        if (!process.env.MONGODB_URI) {
            console.warn('[MongoDB Warning] MONGODB_URI is not set in environment.');
            return;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // ৫ সেকেন্ড টাইমআউট
        });

        isConnected = conn.connections[0].readyState === 1;
        console.log(`[MongoDB] Database Connected Successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB Error] Connection Failed: ${error.message}`);
        console.warn(`[MongoDB Warning] Server will continue running and retry connection.`);
    }
};

module.exports = connectDB;
