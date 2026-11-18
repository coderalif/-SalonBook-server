// ========================================================
// Services Routes (সার্ভিস সংক্রান্ত পাবলিক ও অ্যাডমিন রাউট)
// ========================================================

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Service = require('../models/Service');
const { verifyAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/services
 * @desc    পাবলিক রুট: অ্যাক্টিভ সার্ভিস তালিকা আনা (সার্চ, ক্যাটাগরি ফিল্টার এবং প্রাইস সর্টিং সহ)
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const { search, category, sort, limit } = req.query;

        // প্রাথমিক ফিল্টার: শুধুমাত্র active সার্ভিসগুলো সাধারণ ব্যবহারকারী দেখতে পাবেন
        let query = { status: 'active' };

        // ১. নামের মাধ্যমে সার্চ (Case-insensitive)
        if (search && search.trim() !== '') {
            query.serviceName = { $regex: search.trim(), $options: 'i' };
        }

        // ২. ক্যাটাগরি অনুযায়ী ফিল্টার
        if (category && category !== 'All' && category.trim() !== '') {
            query.category = category.trim();
        }

        // ৩. কোয়েরি বিল্ড করা
        let serviceQuery = Service.find(query);

        // ৪. দাম অনুযায়ী সর্টিং (কম থেকে বেশি অথবা বেশি থেকে কম)
        if (sort === 'lowToHigh') {
            serviceQuery = serviceQuery.sort({ price: 1 });
        } else if (sort === 'highToLow') {
            serviceQuery = serviceQuery.sort({ price: -1 });
        } else {
            // ডিফল্ট: নতুন সার্ভিস আগে আসবে
            serviceQuery = serviceQuery.sort({ createdAt: -1 });
        }

        // ৫. লিমিট (যেমন: হোম পেইজে অন্তত ৬টি সার্ভিস প্রদর্শনের জন্য)
        if (limit) {
            serviceQuery = serviceQuery.limit(parseInt(limit));
        }

        const services = await serviceQuery.exec();

        res.status(200).json({
            success: true,
            count: services.length,
            services
        });
    } catch (error) {
        console.error('Fetch Services Error:', error);
        res.status(500).json({
            success: false,
            message: 'সার্ভিসসমূহ লোড করতে ব্যর্থ হয়েছে!',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/services/categories
 * @desc    পাবলিক রুট: সকল স্বতন্ত্র (Distinct) সার্ভিস ক্যাটাগরি তালিকা আনা
 * @access  Public
 */
router.get('/categories', async (req, res) => {
    try {
        const categories = await Service.distinct('category', { status: 'active' });
        res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'ক্যাটাগরি তালিকা আনতে ব্যর্থ হয়েছে!'
        });
    }
});

/**
 * @route   GET /api/services/admin/all
 * @desc    অ্যাডমিন রুট: সকল সার্ভিস আনা (Active এবং Inactive উভয়ই)
 * @access  Private (Admin Only)
 */
router.get('/admin/all', verifyAdmin, async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: services.length,
            services
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'অ্যাডমিন সার্ভিস তালিকা লোড করতে ব্যর্থ হয়েছে!'
        });
    }
});

/**
 * @route   GET /api/services/:id
 * @desc    একটি নির্দিষ্ট সার্ভিসের বিস্তারিত বিবরণ আনা
 * @access  Public (অথবা Protected Service Details)
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // MongoDB ObjectId ভ্যালিড কিনা চেক করা
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: 'অবৈধ সার্ভিস আইডি! সার্ভিসটি পাওয়া যায়নি।'
            });
        }

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'কাঙ্ক্ষিত সার্ভিসটি খুঁজে পাওয়া যায়নি!'
            });
        }

        res.status(200).json({
            success: true,
            service
        });
    } catch (error) {
        console.error('Single Service Error:', error);
        res.status(500).json({
            success: false,
            message: 'সার্ভিসের বিবরণ আনতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   POST /api/services
 * @desc    নতুন সার্ভিস তৈরি করা (শুধুমাত্র অ্যাডমিন)
 * @access  Private (Admin Only)
 */
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { serviceName, category, description, price, duration, image, status } = req.body;

        // ফিল্ড ভ্যালিডেশন
        if (!serviceName || !category || !description || !price || !duration || !image) {
            return res.status(400).json({
                success: false,
                message: 'অনুগ্রহ করে সার্ভিসের সমস্ত তথ্য সঠিকভাবে পূরণ করুন!'
            });
        }

        // মূল্য এবং সময় অবশ্যই পজিটিভ সংখ্যা হতে হবে
        const numericPrice = Number(price);
        const numericDuration = Number(duration);

        if (numericPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: 'সার্ভিসের মূল্য অবশ্যই শূন্যের চেয়ে বড় (পজিটিভ সংখ্যা) হতে হবে!'
            });
        }

        if (numericDuration <= 0) {
            return res.status(400).json({
                success: false,
                message: 'সার্ভিসের সময়সীমা অবশ্যই পজিটিভ সংখ্যা হতে হবে!'
            });
        }

        const newService = new Service({
            serviceName: serviceName.trim(),
            category: category.trim(),
            description: description.trim(),
            price: numericPrice,
            duration: numericDuration,
            image,
            status: status || 'active'
        });

        await newService.save();

        res.status(201).json({
            success: true,
            message: 'নতুন সার্ভিস সফলভাবে যোগ করা হয়েছে!',
            service: newService
        });
    } catch (error) {
        console.error('Create Service Error:', error);
        res.status(500).json({
            success: false,
            message: 'সার্ভিস যোগ করতে সমস্যা হয়েছে!',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/services/:id
 * @desc    বিদ্যমান সার্ভিসের তথ্য আপডেট করা (শুধুমাত্র অ্যাডমিন)
 * @access  Private (Admin Only)
 */
router.put('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { serviceName, category, description, price, duration, image, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: 'সার্ভিসটি পাওয়া যায়নি!'
            });
        }

        // ভ্যালিডেশন
        if (price !== undefined && Number(price) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'মূল্য অবশ্যই একটি পজিটিভ সংখ্যা হতে হবে!'
            });
        }

        if (duration !== undefined && Number(duration) <= 0) {
            return res.status(400).json({
                success: false,
                message: 'সময় অবশ্যই একটি পজিটিভ সংখ্যা হতে হবে!'
            });
        }

        const updatedService = await Service.findByIdAndUpdate(
            id,
            {
                ...(serviceName && { serviceName: serviceName.trim() }),
                ...(category && { category: category.trim() }),
                ...(description && { description: description.trim() }),
                ...(price !== undefined && { price: Number(price) }),
                ...(duration !== undefined && { duration: Number(duration) }),
                ...(image && { image }),
                ...(status && { status })
            },
            { new: true, runValidators: true }
        );

        if (!updatedService) {
            return res.status(404).json({
                success: false,
                message: 'সার্ভিসটি খুঁজে পাওয়া যায়নি!'
            });
        }

        res.status(200).json({
            success: true,
            message: 'সার্ভিস তথ্য সফলভাবে আপডেট হয়েছে!',
            service: updatedService
        });
    } catch (error) {
        console.error('Update Service Error:', error);
        res.status(500).json({
            success: false,
            message: 'সার্ভিস আপডেট করতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   PATCH /api/services/:id/status
 * @desc    সার্ভিসের অবস্থা টগল করা (Active / Inactive)
 * @access  Private (Admin Only)
 */
router.patch('/:id/status', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'সার্ভিস পাওয়া যায়নি!'
            });
        }

        // স্ট্যাটাস টগল
        service.status = service.status === 'active' ? 'inactive' : 'active';
        await service.save();

        res.status(200).json({
            success: true,
            message: `সার্ভিস স্ট্যাটাস পরিবর্তন করে '${service.status}' করা হয়েছে।`,
            service
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   DELETE /api/services/:id
 * @desc    সার্ভিস ডিলিট করা (শুধুমাত্র অ্যাডমিন)
 * @access  Private (Admin Only)
 */
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({
                success: false,
                message: 'সার্ভিস পাওয়া যায়নি!'
            });
        }

        const deletedService = await Service.findByIdAndDelete(id);
        if (!deletedService) {
            return res.status(404).json({
                success: false,
                message: 'ডিলিট করার জন্য সার্ভিস খুঁজে পাওয়া যায়নি!'
            });
        }

        res.status(200).json({
            success: true,
            message: 'সার্ভিসটি সফলভাবে মুছে ফেলা হয়েছে!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'সার্ভিস মুছতে সমস্যা হয়েছে!'
        });
    }
});

module.exports = router;
