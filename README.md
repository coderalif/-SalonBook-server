# SalonBook - Server (Backend REST API)

SalonBook is an online salon appointment booking system backend built with Node.js, Express.js, MongoDB, JWT Authentication, and Stripe payment gateway. It provides role-based access for Customers and Administrators, handling service management, appointment scheduling, and automated payment processing.

---

## 🔗 Project Links

- **Live Website:** [https://salon-book-omega.vercel.app](https://salon-book-omega.vercel.app)
- **Client Repository:** [https://github.com/coderalif/-SalonBook](https://github.com/coderalif/-SalonBook)
- **Server Repository:** [https://github.com/coderalif/-SalonBook-server](https://github.com/coderalif/-SalonBook-server)

---

## 🚀 Key Features

- **Role-Based Authentication & Authorization:**
  - Secure JWT authentication with bcrypt password hashing.
  - Role verification middleware (`admin` and `customer`).
  - Account blocking system preventing blocked users from accessing protected features.
  - Automated admin credential seeding on startup.

- **Services Management:**
  - Public active service listing with search by service name, category filtering, and price sorting.
  - Admin CRUD operations: Add new services, edit service details, toggle active/inactive status, and delete services.

- **Appointment Scheduling:**
  - Prevent booking inactive services.
  - Duplicate appointment prevention for the same date and time slot.
  - Customer self-service: View personal booking history and cancel pending requests.
  - Admin controls: Review all requests, confirm pending appointments, or cancel.

- **Stripe Payments & Webhook Integration:**
  - Stripe Checkout session generation for confirmed appointments.
  - Verified Stripe webhook endpoint to securely update appointment payment status to `paid`.
  - Automated transaction record logging in the database upon successful payment.

- **Admin Dashboard Analytics:**
  - Aggregated stats: Total customers, active services, appointments overview, and total revenue.

---

## 🛠️ Technology Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) & Bcrypt.js
- **Payment Gateway:** Stripe API & Stripe Webhooks
- **Utilities:** CORS, dotenv, cookie-parser

---

## ⚙️ Required Environment Variables

Create a `.env` file in the root of the `server/` directory and supply the following variables:

```env
PORT
NODE_ENV
MONGODB_URI
JWT_SECRET
CLIENT_URL
ADMIN_EMAIL
ADMIN_PASSWORD
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

*(Refer to `.env.example` for reference structure. Never commit `.env` to GitHub.)*

---

## 💻 Installation & Local Development

1. **Clone the repository:**
   ```bash
   git clone <server-repo-url>
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Update .env with your MongoDB URI, JWT secret, and Stripe keys
   ```

4. **Run the server:**
   - Development Mode (with auto-reload):
     ```bash
     npm run dev
     ```
   - Production Mode:
     ```bash
     npm start
     ```

5. **Server Root Endpoint:**
   - Open `http://localhost:5000` to verify that the server is active.

---

## 📡 API Endpoints Overview

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Create new customer account (with validation)
- `POST /api/auth/login` - Sign in with credentials
- `POST /api/auth/google` - Sign in / Sign up with Google
- `GET /api/auth/me` - Get current authenticated user details
- `PUT /api/auth/profile` - Update customer profile (name, image, phone)

### Services (`/api/services`)
- `GET /api/services` - Get active services (supports `search`, `category`, `sort`, `limit`)
- `GET /api/services/categories` - Get all distinct active service categories
- `GET /api/services/:id` - Get single service details
- `GET /api/services/admin/all` - Get all services (Admin only)
- `POST /api/services` - Create new service (Admin only)
- `PUT /api/services/:id` - Update service details (Admin only)
- `PATCH /api/services/:id/status` - Toggle service active/inactive (Admin only)
- `DELETE /api/services/:id` - Delete service (Admin only)

### Appointments (`/api/appointments`)
- `POST /api/appointments` - Book an appointment (Customer only)
- `GET /api/appointments/my-appointments` - Customer booking history
- `PATCH /api/appointments/cancel/:id` - Cancel pending appointment (Customer only)
- `GET /api/appointments/admin/all` - View all appointments (Admin only)
- `PATCH /api/appointments/admin/:id/confirm` - Confirm pending appointment (Admin only)
- `PATCH /api/appointments/admin/:id/cancel` - Cancel appointment (Admin only)
- `GET /api/appointments/stats/customer` - Customer dashboard overview counts
- `GET /api/appointments/stats/admin` - Admin dashboard overview counts & revenue

### User Management (`/api/users`)
- `GET /api/users` - View all registered customers (Admin only)
- `GET /api/users/:id` - View single user details (Admin only)
- `PATCH /api/users/:id/block-toggle` - Block or unblock customer (Admin only)

### Payments & Transactions (`/api/payments`)
- `POST /api/payments/create-checkout-session` - Create Stripe Checkout session for confirmed appointment
- `POST /api/payments/webhook` - Stripe Webhook listener (verifies signature and updates status to `paid`)
- `GET /api/payments/verify-session/:sessionId` - Verify Stripe session on client redirect
- `GET /api/payments/transactions` - View all payment transactions (Admin only)
