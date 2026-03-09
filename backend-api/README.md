# EduStream Pro - Backend API Setup Guide

## 📋 What We've Built

A complete REST API backend for your school management system with:
- ✅ User authentication (JWT-based)
- ✅ Full CRUD operations for all entities
- ✅ Optimized endpoints for your Broadsheet & Performance features
- ✅ Role-based access control (Admin, Teacher, Parent)
- ✅ Supabase PostgreSQL database
- ✅ Modular architecture for easy feature additions

## 🚀 Quick Start Guide

### Step 1: Set Up Supabase (5 minutes)

1. Go to [https://supabase.com](https://supabase.com)
2. Create a free account
3. Click "New Project"
4. Fill in:
   - Project name: `edustream-pro`
   - Database password: (generate a strong one)
   - Region: Choose closest to Nigeria (e.g., Singapore or Frankfurt)
5. Wait 2 minutes for project to be ready

### Step 2: Run Database Schema

1. In Supabase dashboard, click "SQL Editor" (left sidebar)
2. Click "New Query"
3. Copy the entire contents of `database-schema.sql`
4. Paste into the SQL editor
5. Click "Run" button
6. You should see "Success. No rows returned"

### Step 3: Get Your Supabase Credentials

1. In Supabase, go to "Settings" → "API"
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon Public Key** (long string starting with `eyJ...`)

### Step 4: Configure Backend

1. In the `backend-api` folder, create a file called `.env`
2. Copy contents from `.env.example`
3. Fill in your values:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here

JWT_SECRET=change_this_to_a_long_random_string_abc123xyz789
JWT_EXPIRES_IN=7d
```

**Generate a strong JWT_SECRET**: In terminal, run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Install Dependencies

```bash
cd backend-api
npm install
```

### Step 6: Start the Server

```bash
npm run dev
```

You should see:
```
🚀 EduStream Pro API running on port 3001
📍 Health check: http://localhost:3001/health
```

### Step 7: Test Your API

Open browser and go to: `http://localhost:3001/health`

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "service": "EduStream Pro API"
}
```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/login          - Login
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Get current user
POST   /api/auth/change-password - Change password
```

### Students
```
GET    /api/students            - Get all students
GET    /api/students/:id        - Get single student
POST   /api/students            - Create student
PUT    /api/students/:id        - Update student
DELETE /api/students/:id        - Delete student
GET    /api/students/:id/results - Get student results
```

### Results (Special Endpoints for Your Components)
```
GET    /api/results                    - Get all results
GET    /api/results/broadsheet         - Get broadsheet data
GET    /api/results/performance        - Get performance analytics
POST   /api/results                    - Create/update result
DELETE /api/results/:id                - Delete result
```

### Teachers, Classes, Subjects, Parents, etc.
Similar CRUD pattern for all entities.

## 🔑 Authentication

All requests (except `/api/auth/login`) require a JWT token:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
  'Content-Type': 'application/json'
}
```

## 📝 Example API Calls

### Login
```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'Admin',
    password: 'admin123'
  })
});

const { user, token } = await response.json();
// Save token to localStorage
```

### Get Broadsheet Data
```javascript
const response = await fetch(
  'http://localhost:3001/api/results/broadsheet?classId=C1&session=2024/2025&term=1st Term',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const broadsheetData = await response.json();
```

### Create Student
```javascript
const response = await fetch('http://localhost:3001/api/students', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    dob: '2008-05-15',
    gender: 'Male',
    parent_phone: '+234 812 345 6789',
    class_id: 'C1'
  })
});

const newStudent = await response.json();
```

## 🎯 Next Steps

### For Frontend Integration:

1. **Create API Service Layer** (I'll provide this next)
   - Replace `dataService.ts` calls with API calls
   - Handle authentication tokens
   - Manage loading states

2. **Update Your Components**
   - Minimal changes needed
   - Most components will work as-is
   - Just change data source

3. **Test Each Feature**
   - Login flow
   - CRUD operations
   - Broadsheet generation
   - Performance analytics

## 🚢 Deployment Options

### Option 1: Railway (Recommended - Free Tier)
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. "New Project" → "Deploy from GitHub"
4. Select your repo
5. Add environment variables
6. Deploy! You get a URL like: `https://your-app.up.railway.app`

### Option 2: Render (Free Tier)
1. Push to GitHub
2. Go to [render.com](https://render.com)
3. "New Web Service"
4. Connect GitHub repo
5. Add env variables
6. Deploy

### Option 3: WhoGoHost (VPS)
1. Need VPS plan (not shared hosting)
2. Install Node.js on server
3. Upload backend code
4. Run with PM2 for process management

## 🔒 Security Notes

- ✅ All passwords are hashed with bcrypt
- ✅ JWT tokens expire after 7 days
- ✅ Role-based access control implemented
- ✅ Supabase handles database security
- ⚠️ Change default admin password in production!
- ⚠️ Use HTTPS in production (not HTTP)
- ⚠️ Never commit `.env` file to GitHub

## 🆘 Troubleshooting

### "Cannot connect to Supabase"
- Check your `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- Ensure you ran the database schema
- Check Supabase project is active

### "Token expired" errors
- Login again to get new token
- Check `JWT_EXPIRES_IN` setting

### "Port 3001 already in use"
- Change `PORT` in `.env` to 3002 or another number
- Or kill process using: `lsof -ti:3001 | xargs kill`

## 📞 Adding New Features

When AI Studio creates new components, just add the endpoint:

1. Create new route file in `/routes`
2. Import in `server.js`
3. Use same pattern as existing routes
4. No need to modify components!

## ✅ You're Ready!

Your backend is now set up and ready. Next, I'll create the frontend API service layer to connect your components to this backend.
