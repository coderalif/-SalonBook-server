// ========================================================
// Authentication Routes (সাইনআপ, সাইনইন, গুগল লগইন ও প্রোফাইল)
// ========================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken, verifyCustomer } = require('../middleware/auth');

// হেল্পার ফাংশন: JWT টোকেন তৈরি করা
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET || 'salonbook_super_secret_jwt_key_2026',
        { expiresIn: '7d' } // ৭ দিনের মেয়াদ
    );
};

/**
 * @route   POST /api/auth/register
 * @desc    নতুন সাধারণ কাস্টমার অ্যাকাউন্ট তৈরি (সাইনআপ)
 * @access  Public
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, image } = req.body;

        // ১. প্রয়োজনীয় ফিল্ড চেক করা
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'নাম, ইমেইল এবং পাসওয়ার্ড দেওয়া আবশ্যক!'
            });
        }

        // ২. পাসওয়ার্ড ভ্যালিডেশন নিয়ম:
        // - ন্যূনতম ৬ ক্যারেক্টার
        // - অন্তত একটি ক্যাপিটাল (Uppercase) লেটার
        // - অন্তত একটি স্মল (Lowercase) লেটার
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।'
            });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'পাসওয়ার্ডে অন্তত একটি বড় হাতের (Uppercase) অক্ষর থাকতে হবে।'
            });
        }
        if (!/[a-z]/.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'পাসওয়ার্ডে অন্তত একটি ছোট হাতের (Lowercase) অক্ষর থাকতে হবে।'
            });
        }

        // ৩. আগে থেকেই ইমেইল রেজিস্টার্ড কিনা তা চেক করা
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে!'
            });
        }

        // ৪. পাসওয়ার্ড হ্যাশ করা
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // ৫. নতুন কাস্টমার হিসেবে ইউজার তৈরি
        // সিকিউরিটি নোট: সাধারণ রেজিস্ট্রেশনে সবসময় রোল হবে 'customer'
        const newUser = new User({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            image: image || 'https://i.ibb.co.com/4pDNDk1/avatar-placeholder.png',
            role: 'customer', // অ্যাডমিন কখনো পাবলিক রেজিস্ট্রেশনে তৈরি হতে পারবে না
            isBlocked: false
        });

        await newUser.save();

        // ৬. টোকেন তৈরি ও রেসপন্স প্রদান
        const token = generateToken(newUser._id);

        res.status(201).json({
            success: true,
            message: 'রেজিস্ট্রেশন সফল হয়েছে!',
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                image: newUser.image,
                role: newUser.role,
                isBlocked: newUser.isBlocked
            }
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({
            success: false,
            message: 'সার্ভারে সমস্যা হয়েছে! অনুগ্রহ করে আবার চেষ্টা করুন।',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/login
 * @desc    ইমেইল ও পাসওয়ার্ড দিয়ে সাইনইন করা
 * @access  Public
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // ফিল্ড চেক
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'ইমেইল ও পাসওয়ার্ড দিন!'
            });
        }

        // ইউজার খোঁজা
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'ভুল ইমেইল বা পাসওয়ার্ড!'
            });
        }

        // অ্যাকাউন্ট ব্লক কিনা চেক করা
        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: 'আপনার অ্যাকাউন্টটি স্থগিত (Blocked) করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।'
            });
        }

        // পাসওয়ার্ড মিল আছে কিনা চেক করা
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: 'এই অ্যাকাউন্টটি গুগল লগইন দ্বারা তৈরি করা হয়েছিল। অনুগ্রহ করে গুগল দিয়ে লগইন করুন।'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'ভুল ইমেইল বা পাসওয়ার্ড!'
            });
        }

        // টোকেন তৈরি
        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'লগইন সফল হয়েছে!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                isBlocked: user.isBlocked
            }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'লগইন করতে সমস্যা হচ্ছে!',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/auth/google
 * @desc    গুগল লগইন / সাইনআপ হ্যান্ডলার
 * @access  Public
 */
router.post('/google', async (req, res) => {
    try {
        const { name, email, image } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'গুগল প্রোফাইল থেকে ইমেইল পাওয়া যায়নি!'
            });
        }

        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // যদি অ্যাকাউন্ট ব্লক থাকে
            if (user.isBlocked) {
                return res.status(403).json({
                    success: false,
                    message: 'আপনার অ্যাকাউন্টটি স্থগিত (Blocked) করা হয়েছে।'
                });
            }
        } else {
            // নতুন গুগল ইউজার হিসেবে সংরক্ষণ
            user = new User({
                name: name || 'Google User',
                email: email.toLowerCase(),
                image: image || 'https://i.ibb.co.com/4pDNDk1/avatar-placeholder.png',
                role: 'customer',
                isBlocked: false
            });
            await user.save();
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'গুগল লগইন সফল হয়েছে!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                isBlocked: user.isBlocked
            }
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({
            success: false,
            message: 'গুগল লগইনে সমস্যা হয়েছে!',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/auth/me
 * @desc    লগইন করা ব্যবহারকারীর বর্তমান প্রোফাইল তথ্য আনা
 * @access  Private (টোকেন প্রয়োজন)
 */
router.get('/me', verifyToken, async (req, res) => {
    try {
        res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'প্রোফাইল লোড করা যায়নি!'
        });
    }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    নিজের প্রোফাইল আপডেট (নাম, ছবি, ফোন)
 * @access  Private
 */
router.put('/profile', verifyCustomer, async (req, res) => {
    try {
        const { name, image, phone } = req.body;

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি!'
            });
        }

        // শুধুমাত্র নাম, ছবি ও ফোন নাম্বার আপডেট করা যাবে
        // রোল বা ব্লক স্ট্যাটাস ইউজার নিজে পরিবর্তন করতে পারবে না
        if (name) user.name = name.trim();
        if (image) user.image = image;
        if (phone !== undefined) user.phone = phone.trim();

        await user.save();

        res.status(200).json({
            success: true,
            message: 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                phone: user.phone,
                role: user.role,
                isBlocked: user.isBlocked
            }
        });
    } catch (error) {
        console.error('Profile Update Error:', error);
        res.status(500).json({
            success: false,
            message: 'প্রোফাইল আপডেট করতে সমস্যা হয়েছে!'
        });
    }
});

module.exports = router;
