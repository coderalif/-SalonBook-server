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
    // ডিফল্ট অ্যাডমিন ও স্যাম্পল সার্ভিস ইনসার্ট করা
    await seedAdmin();
    await seedServices();
});

// ২. CORS কনফিগারেশন (ফ্রন্টএন্ডের সাথে সংযোগ স্থাপন)
const allowedOrigins = [
    'http://localhost:3000',
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // যদি লোকাল বা নির্ধারিত ফ্রন্টএন্ড অথবা কোনো অরিজিন ছাড়া (যেমন Postman) রিকোয়েস্ট আসে
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('CORS Not Allowed'));
        }
    },
    credentials: true
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
