// ========================================================
// Authentication & Role Verification Middleware (JWT)
// ========================================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * ১. সাধারণ টোকেন ভেরিফিকেশন মিডলওয়্যার:
 * রিকোয়েস্টের হেডার থেকে Bearer Token চেক করে ব্যবহারকারীকে শনাক্ত করে।
 */
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Authorization হেডার চেক করা
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'অননুমোদিত প্রবেশ! অনুগ্রহ করে লগইন করুন।'
            });
        }

        // 'Bearer <TOKEN>' থেকে টোকেন আলাদা করা
        const token = authHeader.split(' ')[1];

        // JWT ভেরিফাই করা
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'salonbook_super_secret_jwt_key_2026');

        // ডাটাবেজ থেকে ব্যবহারকারী খুঁজে বের করা (পাসওয়ার্ড বাদে)
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি! আবার লগইন করুন।'
            });
        }

        // রিকোয়েস্ট অবজেক্টে ইউজার তথ্য যুক্ত করা
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'টোকেন মেয়াদোত্তীর্ণ বা অকার্যকর! পুনরায় লগইন করুন।',
            error: error.message
        });
    }
};

/**
 * ২. কাস্টমার ও সাধারণ সুরক্ষিত রুট মিডলওয়্যার:
 * ব্যবহারকারী ব্লক (isBlocked) কিনা তা যাচাই করে। ব্লক হলে এক্সেস বন্ধ রাখা হয়।
 */
const verifyCustomer = async (req, res, next) => {
    // আগে টোকেন ভেরিফাই করা হবে
    verifyToken(req, res, async () => {
        if (!req.user) return;

        // ব্যবহারকারী ব্লক কিনা চেক করা
        if (req.user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'আপনার অ্যাকাউন্টটি স্থগিত (Blocked) করা হয়েছে। সাহায্যের জন্য প্রশাসকের সাথে যোগাযোগ করুন।'
            });
        }

        next();
    });
};

/**
 * ৩. অ্যাডমিন ভেরিফিকেশন মিডলওয়্যার:
 * শুধুমাত্র 'admin' রোলধারী ব্যবহারকারীদের অ্যাডমিন রুটে প্রবেশের অনুমতি দেয়।
 */
const verifyAdmin = async (req, res, next) => {
    // আগে টোকেন ভেরিফাই করা হবে
    verifyToken(req, res, async () => {
        if (!req.user) return;

        // ব্লক চেক
        if (req.user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'অ্যাকাউন্ট ব্লক করা রয়েছে।'
            });
        }

        // রোল চেক (Admin কিনা)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'অনুমতি নেই! এই রুটটিতে শুধুমাত্র অ্যাডমিন প্রবেশ করতে পারেন।'
            });
        }

        next();
    });
};

module.exports = {
    verifyToken,
    verifyCustomer,
    verifyAdmin
};
