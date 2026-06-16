# 🎉 EventGather — Full-Stack Event Management System

A production-ready event management platform built with **React + Node.js + MongoDB**.

---

## 📁 Project Structure

```
event-management/
├── backend/                  # Node.js + Express API
│   ├── controllers/          # Route handlers
│   │   ├── authController.js
│   │   ├── eventController.js
│   │   ├── registrationController.js
│   │   └── adminController.js
│   ├── models/               # Mongoose schemas
│   │   ├── User.js
│   │   ├── Event.js
│   │   └── Registration.js
│   ├── middleware/           # JWT auth, admin guard, file upload
│   ├── routes/               # Express routers
│   ├── utils/                # Email, QR code, CSV export
│   ├── uploads/              # Uploaded images (auto-created)
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/                 # React + Vite + Tailwind
    ├── src/
    │   ├── api/              # Axios instance
    │   ├── context/          # AuthContext
    │   ├── components/       # Navbar, EventCard, EventForm, ProtectedRoute
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Events.jsx
    │   │   ├── EventDetail.jsx
    │   │   ├── UserDashboard.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   └── Profile.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or [Atlas](https://cloud.mongodb.com))
- npm v9+

---

### 1. Clone & Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values (see Configuration section)

# Create uploads directory
mkdir -p uploads

# Start development server
npm run dev
```

Backend runs at: `http://localhost:5000`

---

### 2. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## ⚙️ Configuration (.env)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/event-management

# Generate a strong secret: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Gmail SMTP (use App Password, not your real password)
# Enable: Google Account → Security → 2FA → App passwords
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password

# Frontend URL for CORS
FRONTEND_URL=http://localhost:5173
```

---

## 🔐 Creating an Admin Account

After starting the backend, use the API or MongoDB shell:

**Option A — MongoDB Shell / Compass:**
```js
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "admin" } }
)
```

**Option B — Register normally then promote:**
```bash
# Register at http://localhost:5173/register
# Then promote via MongoDB Compass or shell
```

---

## 🛣️ API Routes

### Auth
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register user | Public |
| POST | `/api/auth/login` | Login | Public |
| GET | `/api/auth/me` | Get current user | 🔐 |
| PUT | `/api/auth/profile` | Update profile | 🔐 |
| PUT | `/api/auth/change-password` | Change password | 🔐 |

### Events
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/events` | List events (paginated, filterable) | Public |
| GET | `/api/events/:id` | Get single event | Public |
| POST | `/api/events` | Create event | 🔐 Admin |
| PUT | `/api/events/:id` | Update event | 🔐 Admin |
| DELETE | `/api/events/:id` | Delete event | 🔐 Admin |
| PUT | `/api/events/:id/status` | Update status | 🔐 Admin |

### Registrations
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/registrations/:eventId` | Register for event | 🔐 |
| DELETE | `/api/registrations/:eventId` | Cancel registration | 🔐 |
| GET | `/api/registrations/my` | My registrations | 🔐 |
| GET | `/api/registrations/check/:eventId` | Check if registered | 🔐 |
| POST | `/api/registrations/:id/feedback` | Submit feedback | 🔐 |
| POST | `/api/registrations/:id/checkin` | Check in attendee | 🔐 Admin |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/stats` | Dashboard stats | 🔐 Admin |
| GET | `/api/admin/users` | All users | 🔐 Admin |
| PUT | `/api/admin/users/:id/toggle` | Toggle active | 🔐 Admin |
| PUT | `/api/admin/users/:id/role` | Change role | 🔐 Admin |
| DELETE | `/api/admin/users/:id` | Delete user | 🔐 Admin |
| GET | `/api/admin/events/:id/registrations` | Event registrations | 🔐 Admin |
| GET | `/api/admin/events/:id/export` | Export CSV | 🔐 Admin |
| POST | `/api/admin/events/:id/send-reminder` | Send reminder emails | 🔐 Admin |

---

## 🚀 Production Deployment

### Backend — Render.com (Free)

1. Push `backend/` to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Set environment variables in Render dashboard
4. Build command: `npm install`
5. Start command: `node server.js`

### Frontend — Vercel (Free)

1. Push `frontend/` to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Framework preset: **Vite**
4. Add env variable: `VITE_API_URL=https://your-render-app.onrender.com`
5. Update `frontend/src/api/axios.js` baseURL to use `import.meta.env.VITE_API_URL`

### MongoDB Atlas (Free tier)

1. Create cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Get connection string
3. Replace `MONGO_URI` in your env

---

## ✨ Features Summary

- ✅ JWT Authentication (register, login, protected routes)
- ✅ Role-based access (User / Admin)
- ✅ Full Event CRUD with image upload
- ✅ Smart registration with waitlist & auto-promotion
- ✅ QR code ticket generation
- ✅ Email confirmations, reminders, cancellations
- ✅ CSV export for registrations
- ✅ Admin dashboard with charts (Recharts)
- ✅ User dashboard with feedback/ratings
- ✅ Search & filter events
- ✅ Pagination
- ✅ Rate limiting & security headers (Helmet)
- ✅ Fully responsive UI (Tailwind CSS)
- ✅ Profile picture upload

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| State | React Context, TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Email | Nodemailer |
| Upload | Multer |
| QR Code | qrcode |
| CSV | json2csv |
