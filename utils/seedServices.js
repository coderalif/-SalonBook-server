// ========================================================
// Seed Services Helper: প্রাথমিক স্যালুন সার্ভিসেস ডাটা
// ========================================================

const Service = require('../models/Service');

const initialServices = [
    {
        serviceName: 'Executive Precision Haircut',
        category: 'Haircut & Styling',
        description: 'Professional precision haircut tailored to your face structure, including hair wash, scalp massage, and blow-dry styling.',
        price: 35,
        duration: 45,
        image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
        status: 'active'
    },
    {
        serviceName: 'Balayage & Hair Gloss Treatment',
        category: 'Hair Coloring',
        description: 'Sun-kissed hand-painted highlights with nourishing gloss glaze for vibrant, multi-dimensional hair shine.',
        price: 120,
        duration: 90,
        image: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=800',
        status: 'active'
    },
    {
        serviceName: 'Keratin Deep Moisture Repair',
        category: 'Hair Treatment',
        description: 'Intense anti-frizz smoothing treatment infused with pure keratin and natural argan oil for silky smooth hair.',
        price: 85,
        duration: 60,
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
        status: 'active'
    },
    {
        serviceName: 'Hydra Glow Rejuvenating Facial',
        category: 'Facial & Skincare',
        description: 'Deep pore cleansing, gentle enzyme exfoliation, hydration infusion, and soothing antioxidant face mask.',
        price: 65,
        duration: 50,
        image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
        status: 'active'
    },
    {
        serviceName: 'Glamour Party & Bridal Makeup',
        category: 'Makeup',
        description: 'High-definition waterproof makeover with luxury lashes, customized contouring, and long-lasting setting finish.',
        price: 95,
        duration: 60,
        image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800',
        status: 'active'
    },
    {
        serviceName: 'Deluxe Gel Spa Pedicure',
        category: 'Manicure & Pedicure',
        description: 'Aromatherapy foot soak, sugar scrub massage, cuticle care, heel treatment, and chip-free gel polish application.',
        price: 45,
        duration: 45,
        image: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=800',
        status: 'active'
    },
    {
        serviceName: 'Swedish Relaxing Full Body Massage',
        category: 'Spa & Massage',
        description: 'Gentle, therapeutic muscle relaxation using warm organic essential oils to alleviate tension and stress.',
        price: 80,
        duration: 60,
        image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800',
        status: 'active'
    },
    {
        serviceName: 'Signature Beard Grooming & Hot Towel',
        category: 'Haircut & Styling',
        description: 'Beard trimming, sharp razor edging, conditioning beard oil application, and refreshing hot towel therapy.',
        price: 25,
        duration: 30,
        image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800',
        status: 'active'
    }
];

const seedServices = async () => {
    try {
        const count = await Service.countDocuments();
        if (count === 0) {
            await Service.insertMany(initialServices);
            console.log('[Seed Services] 8 Initial salon services inserted successfully.');
        }
    } catch (error) {
        console.error('[Seed Services Error]:', error.message);
    }
};

module.exports = seedServices;
