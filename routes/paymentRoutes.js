// ========================================================
// Payment Routes (Stripe Checkout, Webhook & Transactions)
// ========================================================

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const Appointment = require('../models/Appointment');
const Transaction = require('../models/Transaction');
const { verifyCustomer, verifyAdmin } = require('../middleware/auth');

/**
 * @route   POST /api/payments/create-checkout-session
 * @desc    কনফার্মড অ্যাপয়েন্টমেন্টের জন্য Stripe Checkout Session তৈরি
 * @access  Private (Customer Only)
 */
router.post('/create-checkout-session', verifyCustomer, async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const customerId = req.user._id;

        if (!appointmentId) {
            return res.status(400).json({
                success: false,
                message: 'অ্যাপয়েন্টমেন্ট আইডি আবশ্যক!'
            });
        }

        // অ্যাপয়েন্টমেন্ট খুঁজে বের করা এবং সার্ভিস তথ্য পপুলেট করা
        const appointment = await Appointment.findById(appointmentId).populate('serviceId');
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'অ্যাপয়েন্টমেন্ট পাওয়া যায়নি!'
            });
        }

        // কাস্টমার নিজের অ্যাপয়েন্টমেন্ট কিনা চেক
        if (appointment.customerId.toString() !== customerId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'অনুমতি নেই! আপনি শুধুমাত্র নিজের অ্যাপয়েন্টমেন্টের পেমেন্ট করতে পারেন।'
            });
        }

        // রিকোয়ারমেন্ট: শুধুমাত্র Confirmed অ্যাপয়েন্টমেন্টের পেমেন্ট করা যাবে
        // "Customers cannot pay for cancelled or pending appointments"
        if (appointment.status !== 'confirmed') {
            return res.status(400).json({
                success: false,
                message: `শুধুমাত্র কনফার্মড অ্যাপয়েন্টমেন্টের পেমেন্ট করা সম্ভব। বর্তমান স্ট্যাটাস: ${appointment.status}`
            });
        }

        // ইতোমধ্যে পেমেন্ট সম্পন্ন হয়েছে কিনা চেক
        if (appointment.paymentStatus === 'paid') {
            return res.status(400).json({
                success: false,
                message: 'এই অ্যাপয়েন্টমেন্টের পেমেন্ট ইতোমধ্যে সম্পন্ন হয়েছে!'
            });
        }

        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

        // স্ট্রাইপ চেকআউট সেশন তৈরি করা
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: req.user.email,
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: appointment.serviceId ? appointment.serviceId.serviceName : 'Salon Service Appointment',
                            description: `Appointment Date: ${appointment.appointmentDate} | Slot: ${appointment.timeSlot}`,
                            images: appointment.serviceId && appointment.serviceId.image ? [appointment.serviceId.image] : []
                        },
                        unit_amount: Math.round(appointment.servicePrice * 100) // ডলারে সেন্টে রূপান্তর
                    },
                    quantity: 1
                }
            ],
            // মেটাডাটাতে অ্যাপয়েন্টমেন্ট এবং কাস্টমার আইডি সেভ রাখা (Webhook-এ লাগবে)
            metadata: {
                appointmentId: appointment._id.toString(),
                customerId: customerId.toString()
            },
            success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${clientUrl}/payment/cancel?appointmentId=${appointment._id}`
        });

        res.status(200).json({
            success: true,
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Stripe Session Error:', error);
        res.status(500).json({
            success: false,
            message: 'পেমেন্ট সেশন তৈরি করতে সমস্যা হয়েছে!',
            error: error.message
        });
    }
});

/**
 * @route   POST /api/payments/webhook
 * @desc    Stripe Webhook Event হ্যান্ডলার (ভেরিফাইড পেমেন্ট আপডেট এবং ট্রানজেকশন সেভ)
 * @access  Public (কিন্তু Stripe Signature দ্বারা ভেরিফাইড)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        if (endpointSecret) {
            // স্ট্রাইপ সিগনেচার যাচাই করা
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } else {
            // লোকাল ডেভেলপমেন্টে সিক্রেট না থাকলে ডিরেক্ট বডি পার্স
            event = JSON.parse(req.body.toString());
        }
    } catch (err) {
        console.error(`⚠️ Webhook Signature Verification Failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // পেমেন্ট সফলভাবে সম্পন্ন হলে
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const appointmentId = session.metadata ? session.metadata.appointmentId : null;
        const customerId = session.metadata ? session.metadata.customerId : null;

        if (appointmentId) {
            try {
                // ১. অ্যাপয়েন্টমেন্টের পেমেন্ট স্ট্যাটাস 'paid' করা
                const appointment = await Appointment.findById(appointmentId);
                if (appointment) {
                    appointment.paymentStatus = 'paid';
                    await appointment.save();
                }

                // ২. ট্রানজেকশন কালেকশনে রেকর্ড সংরক্ষণ করা
                // ডুপ্লিকেট ট্রানজেকশন এড়াতে চেক করা
                const existingTx = await Transaction.findOne({ stripeSessionId: session.id });
                if (!existingTx) {
                    const newTransaction = new Transaction({
                        appointmentId,
                        customerId: customerId || (appointment ? appointment.customerId : null),
                        amount: session.amount_total ? session.amount_total / 100 : (appointment ? appointment.servicePrice : 0),
                        currency: session.currency || 'usd',
                        stripeSessionId: session.id,
                        status: 'paid'
                    });
                    await newTransaction.save();
                    console.log(`[Stripe Webhook] Transaction saved for Appointment: ${appointmentId}`);
                }
            } catch (dbError) {
                console.error('[Stripe Webhook DB Error]:', dbError);
            }
        }
    }

    res.status(200).json({ received: true });
});

/**
 * @route   GET /api/payments/verify-session/:sessionId
 * @desc    পেমেন্ট সাকসেস পেইজের জন্য সেশন তথ্য নিশ্চিত করা
 * @access  Private (Customer Only)
 */
router.get('/verify-session/:sessionId', verifyCustomer, async (req, res) => {
    try {
        const { sessionId } = req.params;

        // স্ট্রাইপ থেকে সেশন রিড করা
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'পেমেন্ট সেশন পাওয়া যায়নি!'
            });
        }

        // যদি কোনো কারণে লোকাল পরিবেশে ওয়েবহুক না চলে, তবে নিশ্চিত করা
        if (session.payment_status === 'paid' && session.metadata && session.metadata.appointmentId) {
            const appointmentId = session.metadata.appointmentId;
            const appointment = await Appointment.findById(appointmentId).populate('serviceId');

            if (appointment && appointment.paymentStatus !== 'paid') {
                appointment.paymentStatus = 'paid';
                await appointment.save();

                const existingTx = await Transaction.findOne({ stripeSessionId: session.id });
                if (!existingTx) {
                    const newTx = new Transaction({
                        appointmentId: appointment._id,
                        customerId: appointment.customerId,
                        amount: session.amount_total / 100,
                        currency: session.currency,
                        stripeSessionId: session.id,
                        status: 'paid'
                    });
                    await newTx.save();
                }
            }

            return res.status(200).json({
                success: true,
                paymentStatus: 'paid',
                appointment
            });
        }

        res.status(200).json({
            success: true,
            session
        });
    } catch (error) {
        console.error('Verify Session Error:', error);
        res.status(500).json({
            success: false,
            message: 'পেমেন্ট তথ্য যাচাই করতে সমস্যা হয়েছে!'
        });
    }
});

/**
 * @route   GET /api/payments/transactions
 * @desc    সকল লেনদেনের তালিকা দেখা (শুধুমাত্র অ্যাডমিন)
 * @access  Private (Admin Only)
 */
router.get('/transactions', verifyAdmin, async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .populate('customerId', 'name email image')
            .populate({
                path: 'appointmentId',
                populate: {
                    path: 'serviceId',
                    select: 'serviceName category'
                }
            })
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: transactions.length,
            transactions
        });
    } catch (error) {
        console.error('Transactions Error:', error);
        res.status(500).json({
            success: false,
            message: 'লেনদেনের তালিকা আনতে সমস্যা হয়েছে!'
        });
    }
});

module.exports = router;
