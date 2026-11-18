// ==========================================
// User Model (ব্যবহারকারীর তথ্য সংরক্ষণ)
// ==========================================

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // ব্যবহারকারীর পুরো নাম
    name: {
        type: String,
        required: [true, 'নাম দেওয়া বাধ্যতামূলক'],
        trim: true
    },
    // ইউনিক ইমেইল অ্যাড্রেস
    email: {
        type: String,
        required: [true, 'ইমেইল দেওয়া বাধ্যতামূলক'],
        unique: true,
        lowercase: true,
        trim: true
    },
    // পাসওয়ার্ড (গুগল লগইনের ক্ষেত্রে অপশনাল হতে পারে)
    password: {
        type: String,
        required: false
    },
    // প্রোফাইল ছবি (ImgBB বা গুগল প্রোফাইল ইমেজ URL)
    image: {
        type: String,
        default: 'https://i.ibb.co.com/4pDNDk1/avatar-placeholder.png'
    },
    // ফোন নাম্বার (প্রোফাইল আপডেটের জন্য)
    phone: {
        type: String,
        default: ''
    },
    // ব্যবহারকারীর রোল: customer অথবা admin (ডিফল্ট: customer)
    role: {
        type: String,
        enum: ['customer', 'admin'],
        default: 'customer'
    },
    // অ্যাকাউন্ট ব্লক স্ট্যাটাস (ব্লক হলে সার্ভিস ব্যবহার করতে পারবে না)
    isBlocked: {
        type: Boolean,
        default: false
    },
    // অ্যাকাউন্ট তৈরির তারিখ ও সময়
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
