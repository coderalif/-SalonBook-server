// ==========================================
// Service Model (স্যালুন সার্ভিসের তথ্য)
// ==========================================

const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    // সার্ভিসের নাম (যেমন: Classic Haircut, Bridal Makeup)
    serviceName: {
        type: String,
        required: [true, 'সার্ভিসের নাম দেওয়া বাধ্যতামূলক'],
        trim: true
    },
    // সার্ভিসের ক্যাটাগরি (যেমন: Haircut & Styling, Hair Treatment, Facial, ইত্যাদি)
    category: {
        type: String,
        required: [true, 'সার্ভিসের ক্যাটাগরি নির্বাচন করা বাধ্যতামূলক'],
        trim: true
    },
    // সার্ভিসের বিস্তারিত বিবরণ
    description: {
        type: String,
        required: [true, 'সার্ভিসের বিবরণ দেওয়া বাধ্যতামূলক'],
        trim: true
    },
    // সার্ভিসের মূল্য (অবশ্যই পজিটিভ নাম্বার হতে হবে)
    price: {
        type: Number,
        required: [true, 'সার্ভিসের মূল্য দেওয়া বাধ্যতামূলক'],
        min: [1, 'মূল্য অবশ্যই একটি পজিটিভ সংখ্যা হতে হবে']
    },
    // আনুমানিক সময়সীমা (মিনিটে, যেমন: ৩০, ৪৫, ৬০)
    duration: {
        type: Number,
        required: [true, 'সার্ভিসের সময়সীমা (মিনিটে) দেওয়া বাধ্যতামূলক'],
        min: [5, 'সময়সীমা অন্তত ৫ মিনিট হতে হবে']
    },
    // সার্ভিসের ছবির লিংক (ImgBB-তে আপলোড করা ছবির URL)
    image: {
        type: String,
        required: [true, 'সার্ভিসের ছবি দেওয়া বাধ্যতামূলক']
    },
    // সার্ভিসের অবস্থা: active অথবা inactive (ডিফল্ট: active)
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    // সার্ভিস তৈরির তারিখ ও সময়
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Service', serviceSchema);
