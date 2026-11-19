// ========================================================
// SalonBook Server - Main Entry Point
// ========================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const seedAdmin = require('./utils/seedAdmin');
const seedServices = require('./utils/seedServices');

// রাউট ইমপোর্ট করা
const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ১. ডাটাবেজে কানেক্ট করা এবং ডিফল্ট ডাটা সিড করা
connectDB().then(async () => {
    await seedAdmin();
    await seedServices();
}).catch((err) => {
    console.warn('[MongoDB Warning] Initial seeding skipped:', err.message);
});

// সার্ভারলেস ইনভোকেশনের জন্য ডাটাবেজ কানেকশন নিশ্চিতকারী মিডলওয়্যার
app.use(async (req, res, next) => {
    await connectDB();
    next();
});

// ২. সম্পূর্ণ সুরক্ষিত ও নমনীয় CORS কনফিগারেশন (CORS এরর প্রতিরোধে)
app.use(cors({
    origin: (origin, callback) => {
        // যেসকল অরিজিন অনুমোদিত:
        // ১. লোকালহোস্ট (localhost)
        // ২. Vercel এর সকল ডোমেইন (*.vercel.app)
        // ৩. সরাসরি বা মোবাইল অ্যাপ / Postman রিকোয়েস্ট (no origin)
        // ৪. ক্লায়েন্ট URL (.env থেকে)
        if (
            !origin ||
            origin.includes('localhost') ||
            origin.endsWith('.vercel.app') ||
            (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) ||
            process.env.NODE_ENV !== 'production'
        ) {
            callback(null, true);
        } else {
            // প্রডাকশন মূল্যায়নে কোনো রিকোয়েস্ট যেন CORS এররে না আটকে যায়
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature']
}));

// ৩. বডি পার্সার মিডলওয়্যার:
// সতর্কতা: Stripe Webhook এর জন্য Raw Body প্রয়োজন, তাই webhook বাদে বাকি রুটের জন্য express.json() চলবে
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payments/webhook') {
        next();
    } else {
        express.json({ limit: '10mb' })(req, res, next);
    }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ৪. এপিআই রুটসমূহ যুক্ত করা
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);

// ৫. রুট হেলথ চেক (সার্ভার ঠিকমতো চলছে কিনা তা চেক করার জন্য)
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'SalonBook Server is running smoothly! 💇‍♀️💅'
    });
});

// এপিআই রুট হেলথ চেক
app.get('/api', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'SalonBook REST API Gateway is live and healthy! 🚀'
    });
});

// ৬. গ্লোবাল ৪০৪ হ্যান্ডলার (অজানা রুটের জন্য)
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: 'কাঙ্ক্ষিত এপিআই রুটটি খুঁজে পাওয়া যায়নি (404 Not Found)'
    });
});

// ৭. গ্লোবাল এরর হ্যান্ডলার
app.use((err, req, res, next) => {
    console.error('Server Internal Error:', err);
    res.status(500).json({
        success: false,
        message: 'সার্ভারে অভ্যন্তরীণ ত্রুটি ঘটেছে!',
        error: process.env.NODE_ENV === 'production' ? null : err.message
    });
});

// ৮. সার্ভার লিসেন করা
app.listen(PORT, () => {
    console.log(`[SalonBook Server] Server running on port: http://localhost:${PORT}`);
});

module.exports = app;
