// ========================================================
// Appointments Routes (অ্যাপয়েন্টমেন্ট বুকিং ও ম্যানেজমেন্ট)
// ========================================================

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { verifyCustomer, verifyAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/appointments
 * @desc    নতুন অ্যাপয়েন্টমেন্ট রিকোয়েস্ট তৈরি (শুধুমাত্র কাস্টমার)
 * @access  Private (Customer Only)
 */
router.post('/', verifyCustomer, async (req, res) => {
    try {
        const { serviceId, appointmentDate, timeSlot, message } = req.body;
        const customerId = req.user._id;

        // ১. অ্যাডমিন বুকিং করতে পারবে না
        if (req.user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'অ্যাডমিন অ্যাকাউন্ট থেকে অ্যাপয়েন্টমেন্ট বুক করা যাবে না। সাধারণ কাস্টমার অ্যাকাউন্ট ব্যবহার করুন।'
            });
        }

        // ২. ফিল্ড ভ্যালিডেশন
        if (!serviceId || !appointmentDate || !timeSlot) {
            return res.status(400).json({
                success: false,
                message: 'সার্ভিস, অ্যাপয়েন্টমেন্টের তারিখ এবং টাইম স্লট দেওয়া আবশ্যক!'
            });
        }

        // ৩. সার্ভিসটি বিদ্যমান ও অ্যাক্টিভ কিনা যাচাই
        if (!mongoose.Types.ObjectId.isValid(serviceId)) {
            return res.status(404).json({
                success: false,
                message: 'অবৈধ সার্ভিস!'
            });
        }

        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'সার্ভিসটি পাওয়া যায়নি!'
            });
        }

        // রিকোয়ারমেন্ট: "Prevent customers from booking inactive services"
        if (service.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'দুঃখিত, এই সার্ভিসটি বর্তমানে সাময়িকভাবে বন্ধ রয়েছে!'
            });
        }

        // ৪. ডুপ্লিকেট বুকিং চেক: একই সার্ভিস, তারিখ ও টাইম স্লটে সক্রিয় (Pending বা Confirmed) বুকিং আছে কিনা
        // রিকোয়ারমেন্ট: "Prevent duplicate active appointments for the same date and time slot"
        const existingAppointment = await Appointment.findOne({
            serviceId,
            appointmentDate,
            timeSlot,
            status: { $in: ['pending', 'confirmed'] } // Cancelled বাদে
        });

        if (existingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'দুঃখিত! এই তারিখ এবং সময়ে এই সার্ভিসটির বুকিং ইতোমধ্যে নেওয়া হয়েছে। অনুগ্রহ করে অন্য টাইম স্লট বা তারিখ নির্বাচন করুন।'
            });
        }

        // ৫. নতুন অ্যাপয়েন্টমেন্ট তৈরি করা
        const newAppointment = new Appointment({
            serviceId,
            customerId,
            appointmentDate,
            timeSlot,
            message: message ? message.trim() : '',
            servicePrice: service.price,
            paymentStatus: 'unpaid',
            status: 'pending'
        });

        await newAppointment.save();

        res.status(201).json({
            success: true,
            message: 'আপনার অ্যাপয়েন্টমেন্ট রিকোয়েস্ট সফলভাবে জমা দেওয়া হয়েছে! অ্যাডমিন পর্যালোচনা করার পর কনফার্ম করবেন।',
            appointment: newAppointment
        });
    } catch (error) {
        console.error('Create Appointment Error:', error);
        res.status(500).json({
            success: false,
            message: 'অ্যাপয়েন্টমেন্ট বুকিং ব্যর্থ হয়েছে!',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/appointments/my-appointments
 * @desc    লগইন করা কাস্টমারের নিজস্ব অ্যাপয়েন্টমেন্ট তালিকা দেখা
 * @access  Private (Customer Only)
 */
router.get('/my-appointments', verifyCustomer, async (req, res) => {
    try {
        const customerId = req.user._id;

        // শুধুমাত্র লগইন করা কাস্টমারের বুকিংগুলো আনা এবং সার্ভিসের বিবরণ পপুলেট করা
        const appointments = await Appointment.find({ customerId })
            .populate('serviceId', 'serviceName category image price duration')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            appointments
        });
    } catch (error) {
        console.error('Fetch My Appointments Error:', error);
        res.status(500).json({
            success: false,
            message: 'অ্যাপয়েন্টমেন্ট তালিকা লোড করা যায়নি!'
        });
    }
});

/**
 * @route   PATCH /api/appointments/cancel/:id
 * @desc    কাস্টমার কর্তৃক শুধুমাত্র Pending অ্যাপয়েন্টমেন্ট বাতিল করা
 * @access  Private (Customer Only)
 */
router.patch('/cancel/:id', verifyCustomer, async (req, res) => {
    try {
        const { id } = req.params;
        const customerId = req.user._id;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি!'
            });
        }

        // রিকোয়ারমেন্ট: কাস্টমার শুধুমাত্র নিজের অ্যাপয়েন্টমেন্ট বাতিল করতে পারবে
        if (appointment.customerId.toString() !== customerId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'আপনি অন্য কারো অ্যাপয়েন্টমেন্ট বাতিল করতে পারবেন না!'
            });
        }

        // রিকোয়ারমেন্ট: শুধুমাত্র Pending অবস্থায় কাস্টমার বাতিল করতে পারবে
        // "Customers cannot cancel an already confirmed or cancelled appointment"
        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `শুধুমাত্র অপেক্ষমাণ (Pending) অ্যাপয়েন্টমেন্ট বাতিল করা সম্ভব। বর্তমান স্ট্যাটাস: ${appointment.status}`
            });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        res.status(200).json({
            success: true,
            message: 'অ্যাপয়েন্টমেন্ট সফলভাবে বাতিল করা হয়েছে।',
            appointment
        });
    } catch (error) {
        console.error('Cancel Appointment Error:', error);
        res.status(500).json({
            success: false,
            message: 'অ্যাপয়েন্টমেন্ট বাতিল করতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   GET /api/appointments/admin/all
 * @desc    অ্যাডমিনের জন্য সকল অ্যাপয়েন্টমেন্ট তালিকা দেখা
 * @access  Private (Admin Only)
 */
router.get('/admin/all', verifyAdmin, async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('serviceId', 'serviceName category price image duration')
            .populate('customerId', 'name email image phone')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: appointments.length,
            appointments
        });
    } catch (error) {
        console.error('Admin Appointments Error:', error);
        res.status(500).json({
            success: false,
            message: 'অ্যাপয়েন্টমেন্ট তালিকা আনতে ব্যর্থ হয়েছে!'
        });
    }
});

/**
 * @route   PATCH /api/appointments/admin/:id/confirm
 * @desc    অ্যাডমিন কর্তৃক অপেক্ষমাণ অ্যাপয়েন্টমেন্ট কনফার্ম করা
 * @access  Private (Admin Only)
 */
router.patch('/admin/:id/confirm', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'অ্যাপয়েন্টমেন্ট খুঁজে পাওয়া যায়নি!'
            });
        }

        // রিকোয়ারমেন্ট: "Only pending appointments can be confirmed"
        if (appointment.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `শুধুমাত্র অপেক্ষমাণ (Pending) অ্যাপয়েন্টমেন্ট কনফার্ম করা যাবে! বর্তমান অবস্থা: ${appointment.status}`
            });
        }

        appointment.status = 'confirmed';
        await appointment.save();

        res.status(200).json({
            success: true,
            message: 'অ্যাপয়েন্টমেন্ট সফলভাবে কনফার্ম করা হয়েছে!',
            appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'কনফার্ম করতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   PATCH /api/appointments/admin/:id/cancel
 * @desc    অ্যাডমিন কর্তৃক অ্যাপয়েন্টমেন্ট বাতিল করা (Pending বা Confirmed)
 * @access  Private (Admin Only)
 */
router.patch('/admin/:id/cancel', verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'অ্যাপয়েন্টমেন্ট খুঁজে পাওয়া যায়নি!'
            });
        }

        if (appointment.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'অ্যাপয়েন্টমেন্টটি ইতোমধ্যে বাতিল রয়েছে!'
            });
        }

        appointment.status = 'cancelled';
        await appointment.save();

        res.status(200).json({
            success: true,
            message: 'অ্যাপয়েন্টমেন্ট সফলভাবে বাতিল করা হয়েছে।',
            appointment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'বাতিল করতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   GET /api/appointments/stats/customer
 * @desc    কাস্টমার ড্যাশবোর্ড ওভারভিউ পরিসংখ্যান (Stats)
 * @access  Private (Customer Only)
 */
router.get('/stats/customer', verifyCustomer, async (req, res) => {
    try {
        const customerId = req.user._id;

        const total = await Appointment.countDocuments({ customerId });
        const pending = await Appointment.countDocuments({ customerId, status: 'pending' });
        const confirmed = await Appointment.countDocuments({ customerId, status: 'confirmed' });
        const cancelled = await Appointment.countDocuments({ customerId, status: 'cancelled' });

        res.status(200).json({
            success: true,
            stats: {
                total,
                pending,
                confirmed,
                cancelled
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'পরিসংখ্যান লোড করতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   GET /api/appointments/stats/admin
 * @desc    অ্যাডমিন ড্যাশবোর্ড ওভারভিউ পরিসংখ্যান (Stats)
 * @access  Private (Admin Only)
 */
router.get('/stats/admin', verifyAdmin, async (req, res) => {
    try {
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        const totalActiveServices = await Service.countDocuments({ status: 'active' });
        const totalAppointments = await Appointment.countDocuments();
        const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
        const confirmedAppointments = await Appointment.countDocuments({ status: 'confirmed' });
        
        // মোট সফল পেমেন্ট ও রেভিনিউ গণনা
        const successfulPaymentsCount = await Transaction.countDocuments({ status: 'paid' });
        const payments = await Transaction.find({ status: 'paid' });
        const totalRevenue = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);

        res.status(200).json({
            success: true,
            stats: {
                totalCustomers,
                totalActiveServices,
                totalAppointments,
                pendingAppointments,
                confirmedAppointments,
                successfulPaymentsCount,
                totalRevenue
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'অ্যাডমিন পরিসংখ্যান লোড করতে সমস্যা হয়েছে!'
        });
    }
});

module.exports = router;
