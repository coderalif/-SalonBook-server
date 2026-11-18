// ========================================================
// Seed Admin Helper: ডিফল্ট অ্যাডমিন অ্যাকাউন্ট তৈরি
// ========================================================

const bcrypt = require('bcryptjs');
const User = require('../models/User');

/**
 * সার্ভার চালু হওয়ার সময় স্বয়ংক্রিয়ভাবে অ্যাডমিন অ্যাকাউন্ট আছে কিনা চেক করা।
 * না থাকলে .env থেকে পাওয়া ক্রেডেনশিয়াল দিয়ে অ্যাডমিন তৈরি করবে।
 */
const seedAdmin = async () => {
    try {
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
            // যদি ইউজার থেকে থাকে তবে নিশ্চিত করা রোল যেন admin থাকে
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                await existingAdmin.save();
            }
        }
    } catch (error) {
        console.error('[Seed Admin Error]:', error.message);
    }
};

module.exports = seedAdmin;
