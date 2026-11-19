// ========================================================
// Seed Admin & Demo Customer Helper: ডিফল্ট অ্যাকাউন্ট তৈরি
// ========================================================

const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * সার্ভার চালু হওয়ার সময় স্বয়ংক্রিয়ভাবে অ্যাডমিন ও ডেমো কাস্টমার অ্যাকাউন্ট আছে কিনা চেক করা।
 * না থাকলে ক্রেডেনশিয়াল দিয়ে অ্যাকাউন্ট তৈরি করবে যাতে পরীক্ষক সরাসরি ডেমো বাটন চেপে লগইন করতে পারেন।
 */
const seedAdmin = async () => {
    try {
        // ১. অ্যাডমিন অ্যাকাউন্ট সিড করা
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@salonbook.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

        const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(adminPassword, salt);

            const adminUser = new User({
                name: 'SalonBook Admin',
                email: adminEmail.toLowerCase(),
                password: hashedPassword,
                image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
                role: 'admin',
                isBlocked: false
            });

            await adminUser.save();
            console.log(`[Seed Admin] Default Admin account created successfully: ${adminEmail}`);
        } else {
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                await existingAdmin.save();
            }
        }

        // ২. ডেমো কাস্টমার অ্যাকাউন্ট সিড করা (যাতে Fill Customer বাটন কাজ করে)
        const customerEmail = 'customer@example.com';
        const customerPassword = 'Customer@123';

        const existingCustomer = await User.findOne({ email: customerEmail.toLowerCase() });

        if (!existingCustomer) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(customerPassword, salt);

            const customerUser = new User({
                name: 'Demo Customer',
                email: customerEmail.toLowerCase(),
                password: hashedPassword,
                image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
                role: 'customer',
                isBlocked: false
            });

            await customerUser.save();
            console.log(`[Seed Customer] Demo Customer account created successfully: ${customerEmail}`);
        }
    } catch (error) {
        console.error('[Seed Accounts Error]:', error.message);
    }
};

module.exports = seedAdmin;
