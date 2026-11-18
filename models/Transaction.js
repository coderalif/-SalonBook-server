// ==========================================
// Transaction Model (পেমেন্ট লেনদেনের রেকর্ড)
// ==========================================

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // কোন অ্যাপয়েন্টমেন্টের বিপরীতে পেমেন্ট হয়েছে (Appointment Reference)
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: [true, 'অ্যাপয়েন্টমেন্ট আইডি বাধ্যতামূলক']
    },
    // যে কাস্টমার পেমেন্ট সম্পন্ন করেছেন (User Reference)
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'কাস্টমার আইডি বাধ্যতামূলক']
    },
    // পেমেন্টের পরিমাণ
    amount: {
        type: Number,
        required: [true, 'পেমেন্ট অ্যামাউন্ট বাধ্যতামূলক']
    },
    // মুদ্রা (যেমন: usd)
    currency: {
        type: String,
        default: 'usd',
        uppercase: true
    },
    // স্ট্রাইপ চেকআউট সেশন আইডি বা পেমেন্ট রেফারেন্স
    stripeSessionId: {
        type: String,
        required: [true, 'স্ট্রাইপ সেশন আইডি বাধ্যতামূলক']
    },
    // পেমেন্ট সফল হয়েছে কিনা (paid অথবা failed)
    status: {
        type: String,
        enum: ['paid', 'failed'],
        default: 'paid'
    },
    // ট্রানজেকশনের তারিখ ও সময়
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);
