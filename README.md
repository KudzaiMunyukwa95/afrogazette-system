# AfroGazette Advert Scheduling System

A complete full-stack application for managing WhatsApp advert scheduling with PostgreSQL database, Node.js backend, and React frontend.

## 📋 Overview

This system replaces Excel-based WhatsApp advert scheduling with an automated solution featuring:

- **15 Daily Time Slots** (06:00 - 20:00, hourly intervals)
- **2 Adverts per Slot Maximum**
- **Category Conflict Prevention** (no duplicate categories in same slot)
- **Automatic Scheduling Engine**
- **Role-Based Access Control** (Admin & Sales Rep)
- **Real-time Dashboard Analytics**

## 🏗️ System Architecture

```
afrogazette-system/
├── backend/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/         # Database & migrations
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth & validation
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── server.js       # Entry point
│   └── package.json
│
└── frontend/               # React + Vite
    ├── src/
    │   ├── components/     # Reusable components
    │   ├── context/        # Auth context
    │   ├── pages/          # Route pages
    │   ├── services/       # API client
    │   └── main.jsx        # Entry point
    └── package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- PostgreSQL database (Render provides this)
- Text editor

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-key
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.onrender.com
```

Run migrations:
```bash
npm run migrate
```

Start server:
```bash
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file:
```env
VITE_API_URL=https://your-backend-url.onrender.com/api
```

Start development:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## 📊 Database Schema

### Tables

1. **users**
   - id, email, password, full_name, role (admin/sales_rep)

2. **time_slots**
   - id, slot_time, slot_label (06:00 AM - 08:00 PM)

3. **adverts**
   - id, client_name, category, caption, media_url
   - days_paid, payment_date, amount_paid, start_date, end_date
   - status (pending/active/expired), assigned_slot_id
   - sales_rep_id, approved_by, remaining_days

4. **daily_slot_assignments**
   - id, advert_id, slot_id, assignment_date
   - Tracks which adverts occupy which slots on which days

### Default Data
- 15 time slots (06:00 - 20:00)
- Admin account: admin@afrogazette.com / Admin@123

## 🔐 User Roles

### Admin
- Approve/reject adverts
- Assign time slots
- Edit adverts
- Extend days
- View all analytics
- Manage users
- Full schedule access

### Sales Rep
- Create adverts (pending state)
- View own adverts only
- See pending/active/expired status
- View assigned slots after approval
- Track remaining days
- Cannot approve or assign slots

## 🔄 Workflow

1. **Sales Rep Creates Advert**
   - Fills form with client details
   - Status: PENDING
   - No slot assigned yet

2. **Admin Reviews**
   - Views pending adverts
   - Checks slot availability
   - Selects time slot
   - System checks:
     - Max 2 adverts per slot
     - No category conflicts
   - Clicks "Approve"

3. **System Auto-Schedules**
   - Assigns selected slot
   - Creates daily assignments for all paid days
   - Status: ACTIVE
   - Calculates remaining_days

4. **Daily Auto-Update** (Cron Job)
   - Updates remaining_days
   - Moves to EXPIRED when days = 0
   - Frees up slot automatically

## 🛣️ API Endpoints

### Authentication
```
POST   /api/auth/login          # Login
POST   /api/auth/register       # Register (admin only)
GET    /api/auth/profile        # Get profile
```

### Users (Admin Only)
```
GET    /api/users               # List all users
POST   /api/users               # Create user
PATCH  /api/users/:id           # Update user
DELETE /api/users/:id           # Delete user
```

### Adverts
```
POST   /api/adverts                    # Create advert (sales rep)
GET    /api/adverts                    # Get adverts (filtered by role)
GET    /api/adverts/pending            # Pending adverts (admin)
POST   /api/adverts/:id/approve        # Approve & assign slot (admin)
POST   /api/adverts/:id/extend         # Extend days (admin)
PATCH  /api/adverts/:id                # Update advert (admin)
DELETE /api/adverts/:id                # Delete advert
```

### Slots
```
GET    /api/slots                      # All time slots
GET    /api/slots/today                # Today's schedule
GET    /api/slots/calendar?date=YYYY-MM-DD  # Specific date
GET    /api/slots/vacant?startDate=...      # Vacant slots
GET    /api/slots/check-availability   # Check conflicts
```

### Analytics
```
GET    /api/analytics/dashboard        # Admin dashboard (admin)
GET    /api/analytics/my-dashboard     # Sales rep dashboard
```

## 🎨 Frontend Pages

### Public
- `/login` - Login page

### Sales Rep
- `/dashboard` - My adverts overview
- `/create-advert` - Create new advert form

### Admin
- `/dashboard` - Full analytics dashboard
- `/pending-approvals` - Approve & assign slots
- `/schedule` - View daily schedule
- `/users` - User management

## 🔧 Key Features

### Scheduling Engine
- Automatic daily slot assignment
- Conflict detection (capacity + category)
- Remaining days calculation
- Auto-expiry when days = 0

### Category Conflict Prevention
```
Rule: No two adverts of the same category in the same slot on the same day

Example:
Slot 10:00 AM on 2024-12-01:
✓ Automotive + Real Estate = OK
✗ Automotive + Automotive = CONFLICT
```

### Capacity Management
```
Each slot can hold MAX 2 adverts simultaneously
```

### Cron Jobs
- **Daily (00:00)**: Update remaining days, expire finished adverts
- **Weekly (Sundays 02:00)**: Cleanup old assignments (90+ days)

## 🌐 Deployment to Render

### Backend Deployment

1. **Create PostgreSQL Database**
   - Go to Render Dashboard
   - New > PostgreSQL
   - Copy DATABASE_URL

2. **Create Web Service**
   - New > Web Service
   - Connect your repo (or manual deploy)
   - Settings:
     - Build Command: `cd backend && npm install`
     - Start Command: `cd backend && npm run migrate && npm start`
   - Environment Variables:
     ```
     DATABASE_URL=<from postgres>
     JWT_SECRET=<random-string>
     PORT=5000
     NODE_ENV=production
     FRONTEND_URL=<your-frontend-url>
     ```

3. **Run Migration**
   - After first deploy, check logs for migration success
   - Default admin created automatically

### Frontend Deployment

1. **Create Static Site**
   - New > Static Site
   - Settings:
     - Build Command: `cd frontend && npm install && npm run build`
     - Publish Directory: `frontend/dist`
   - Environment Variables:
     ```
     VITE_API_URL=<your-backend-url>/api
     ```

2. **Update Backend CORS**
   - Add frontend URL to backend's FRONTEND_URL env var

## 🧪 Testing Guide

### 1. Login
```bash
POST http://localhost:5000/api/auth/login
{
  "email": "admin@afrogazette.com",
  "password": "Admin@123"
}
```

### 2. Create Advert (Sales Rep)
```bash
POST http://localhost:5000/api/adverts
Authorization: Bearer <token>
{
  "clientName": "ABC Motors",
  "category": "automotive",
  "caption": "Visit ABC Motors for the best deals!",
  "mediaUrl": "https://example.com/image.jpg",
  "daysPaid": 7,
  "paymentDate": "2024-12-01",
  "amountPaid": 500,
  "startDate": "2024-12-05"
}
```

### 3. Get Pending (Admin)
```bash
GET http://localhost:5000/api/adverts/pending
Authorization: Bearer <token>
```

### 4. Approve & Assign (Admin)
```bash
POST http://localhost:5000/api/adverts/1/approve
Authorization: Bearer <token>
{
  "slotId": 5
}
```

### 5. View Schedule
```bash
GET http://localhost:5000/api/slots/calendar?date=2024-12-05
Authorization: Bearer <token>
```

## 📝 Default Credentials

```
Email: admin@afrogazette.com
Password: Admin@123
```

⚠️ **IMPORTANT**: Change this password immediately after first login!

## 🐛 Troubleshooting

### Database Connection Failed
- Check DATABASE_URL format
- Ensure PostgreSQL is running
- Verify SSL settings

### Migration Failed
- Check database permissions
- Ensure database is empty or compatible
- Review migration logs

### CORS Error
- Verify FRONTEND_URL matches exactly
- Check backend is running
- Ensure protocol (http/https) is correct

### Token Expired
- Login again to get new token
- Check JWT_SECRET is set
- Verify token in localStorage

## 📄 License

MIT License - Free to use and modify

## 👥 Support

For issues or questions:
1. Check logs for error details
2. Verify environment variables
3. Ensure database migrations ran
4. Review API responses

---

Built with ❤️ for AfroGazette
