// ========================================================
// Users Management Routes (অ্যাডমিন কর্তৃক ইউজার ম্যানেজমেন্ট)
// ========================================================

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const { verifyAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/users
 * @desc    সকল রেজিস্টার্ড কাস্টমার তালিকা দেখা (শুধুমাত্র অ্যাডমিন)
 * @access  Private (Admin Only)
 */
router.get('/', verifyAdmin, async (req, res) => {
    try {
        // রোল কাস্টমার এমন সকল ব্যবহারকারীর তালিকা আনা
        const users = await User.find({ role: 'customer' })
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Fetch Users Error:', error);
        res.status(500).json({
            success: false,
            message: 'কাস্টমার তালিকা লোড করতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   GET /api/users/:id
 * @desc    নির্দিষ্ট কোনো ব্যবহারকারীর বিস্তারিত তথ্য দেখা
 * @access  Private (Admin Only)
 */
router.get('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: 'অবৈধ ইউজার আইডি!'
            });
        }

        const user = await User.findById(id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি!'
            });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'ব্যবহারকারীর তথ্য আনতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   PATCH /api/users/:id/block-toggle
 * @desc    কাস্টমারকে ব্লক অথবা আনব্লক করা (ব্লক থাকলে আনব্লক, আনব্লক থাকলে ব্লক)
 * @access  Private (Admin Only)
 */
router.patch('/:id/block-toggle', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // অ্যাডমিন নিজেকে নিজে ব্লক করতে পারবে না
        if (id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'আপনি নিজের অ্যাকাউন্ট ব্লক করতে পারবেন না!'
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি!'
            });
        }

        // অন্য কোনো অ্যাডমিনকে ব্লক করার অনুমতি দেওয়া যাবে না
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'অ্যাডমিন অ্যাকাউন্ট ব্লক করা সম্ভব নয়!'
            });
        }

        // ব্লক স্ট্যাটাস টগল করা (true হলে false, false হলে true)
        user.isBlocked = !user.isBlocked;
        await user.save();

        const statusMessage = user.isBlocked ? 'ব্লক (Blocked)' : 'আনব্লক (Active)';

        res.status(200).json({
            success: true,
            message: `ব্যবহারকারীকে সফলভাবে ${statusMessage} করা হয়েছে।`,
            isBlocked: user.isBlocked
        });
    } catch (error) {
        console.error('Block Toggle Error:', error);
        res.status(500).json({
            success: false,
            message: 'ব্লক স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে!'
        });
    }
});

module.exports = router;
