// ==========================================
// Appointment Model (অ্যাপয়েন্টমেন্টের তথ্য)
// ==========================================

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    // যে সার্ভিসের জন্য বুক করা হয়েছে (Service Reference)
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: [true, 'সার্ভিস আইডি প্রয়োজন']
    },
    // যে কাস্টমার বুক করেছে (User Reference)
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'কাস্টমার আইডি প্রয়োজন']
    },
    // অ্যাপয়েন্টমেন্টের তারিখ (YYYY-MM-DD ফরম্যাট)
    appointmentDate: {
        type: String,
        required: [true, 'তারিখ নির্ধারণ করা বাধ্যতামূলক']
    },
    // নির্বাচিত টাইম স্লট (যেমন: 10:00 AM - 11:00 AM)
    timeSlot: {
        type: String,
        required: [true, 'টাইম স্লট নির্বাচন করা বাধ্যতামূলক']
    },
    // কাস্টমারের কোনো অতিরিক্ত মেসেজ বা নোট (অপশনাল)
    message: {
        type: String,
        trim: true,
        default: ''
    },
    // বুকিং এর সময় সার্ভিসের মূল্য
    servicePrice: {
        type: Number,
        required: true
    },
    // পেমেন্ট স্ট্যাটাস: unpaid অথবা paid (ডিফল্ট: unpaid)
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid'],
        default: 'unpaid'
    },
    // অ্যাপয়েন্টমেন্টের অবস্থা: pending, confirmed, cancelled (ডিফল্ট: pending)
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending'
    },
    // অ্যাপয়েন্টমেন্ট রিকোয়েস্টের তারিখ ও সময়
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Appointment', appointmentSchema);
