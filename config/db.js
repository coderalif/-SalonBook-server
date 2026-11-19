// ==========================================
// Database Connection Configuration (MongoDB)
// ==========================================

const mongoose = require('mongoose');

// MongoDB-তে কানেক্ট করার ফাংশন
const connectDB = async () => {
    try {
        // .env ফাইল থেকে MONGODB_URI রিড করা হবে
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`[MongoDB] Database Connected Successfully: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[MongoDB Error] Connection Failed: ${error.message}`);
        console.warn(`[MongoDB Warning] Server will continue running and retry connection.`);
    }
};

module.exports = connectDB;
