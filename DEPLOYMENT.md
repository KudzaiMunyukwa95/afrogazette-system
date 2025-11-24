# Render Deployment Guide - AfroGazette System

## Step-by-Step Deployment (No Git Required)

### PHASE 1: Create PostgreSQL Database

1. **Login to Render**
   - Go to https://render.com
   - Sign up or login

2. **Create New PostgreSQL Database**
   - Click "New +" button
   - Select "PostgreSQL"
   - Fill in:
     - Name: `afrogazette-db`
     - Database: `afrogazette`
     - User: (auto-generated)
     - Region: Select closest to you
     - Plan: Free or Starter
   - Click "Create Database"

3. **Save Connection Details**
   - Wait for database to provision (2-3 minutes)
   - Go to "Info" tab
   - Copy the **Internal Database URL**
   - Example: `postgresql://user:pass@dpg-xxxxx/afrogazette`
   - Save this - you'll need it for backend!

---

### PHASE 2: Deploy Backend

1. **Create Web Service**
   - Click "New +" button
   - Select "Web Service"
   - Choose "Build and deploy from a Git repository"
   - OR "Deploy an existing image from a registry"
   - For manual: Select "Public Git repository" and use a placeholder

2. **Manual Deployment Alternative**
   - Since we're not using Git, we'll use Render's "Shell" option
   - OR deploy via Docker
   - **Recommended**: Create a GitHub repo and push your code

3. **Backend Configuration**

   **Build Settings:**
   ```
   Build Command:
   cd backend && npm install
   ```

   **Start Command:**
   ```
   cd backend && npm run migrate && npm start
   ```

   **Root Directory:** Leave blank (or `backend` if organized)

4. **Environment Variables**
   
   Click "Environment" tab and add:

   ```
   DATABASE_URL
   Value: <paste your Internal Database URL from step 1.3>

   JWT_SECRET
   Value: <generate a random string, e.g., "AfroGazette2024SecureKey123!@#">

   PORT
   Value: 5000

   NODE_ENV
   Value: production

   FRONTEND_URL
   Value: https://your-frontend-name.onrender.com
   (You'll update this after frontend is deployed)
   ```

5. **Deploy Backend**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Check "Logs" tab for:
     - ✅ Database connected successfully
     - ✅ Database tables created successfully
     - ✅ Default admin user created
   - Copy your backend URL (e.g., `https://afrogazette-api.onrender.com`)

6. **Verify Backend**
   - Open: `https://your-backend-url.onrender.com/health`
   - Should return: `{"success":true,"message":"AfroGazette API is running"}`

---

### PHASE 3: Deploy Frontend

1. **Create Static Site**
   - Click "New +" button
   - Select "Static Site"
   - Connect repository or use manual

2. **Frontend Configuration**

   **Build Settings:**
   ```
   Build Command:
   cd frontend && npm install && npm run build
   ```

   **Publish Directory:**
   ```
   frontend/dist
   ```

3. **Environment Variables**
   
   Add this BEFORE building:

   ```
   VITE_API_URL
   Value: https://your-backend-url.onrender.com/api
   ```

   Example: `https://afrogazette-api.onrender.com/api`

4. **Deploy Frontend**
   - Click "Create Static Site"
   - Wait for build (3-5 minutes)
   - Your frontend URL: `https://afrogazette.onrender.com`

5. **Update Backend CORS**
   - Go back to backend service
   - Update `FRONTEND_URL` environment variable
   - Set to: `https://your-frontend-url.onrender.com`
   - Backend will auto-redeploy

---

### PHASE 4: Manual Deployment (No Git)

If you don't want to use Git, here's how to deploy manually:

#### Option A: ZIP Upload (Recommended)

1. **Create GitHub Repository** (easiest path)
   - Create free GitHub account
   - Create new repository
   - Upload the ZIP contents
   - Connect Render to GitHub repo

#### Option B: Docker Deployment

1. **Create Dockerfile for Backend**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY backend/package*.json ./
   RUN npm install
   COPY backend/ ./
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. **Build and Push to Docker Hub**
   ```bash
   docker build -t yourusername/afrogazette-backend .
   docker push yourusername/afrogazette-backend
   ```

3. **Deploy from Docker on Render**
   - New > Web Service
   - Select "Deploy an existing image"
   - Enter: `yourusername/afrogazette-backend`

#### Option C: Render Blueprint (YAML)

Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: afrogazette-backend
    env: node
    buildCommand: cd backend && npm install
    startCommand: cd backend && npm run migrate && npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: afrogazette-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production

  - type: web
    name: afrogazette-frontend
    env: static
    buildCommand: cd frontend && npm install && npm run build
    staticPublishPath: frontend/dist
    envVars:
      - key: VITE_API_URL
        value: https://afrogazette-backend.onrender.com/api

databases:
  - name: afrogazette-db
    plan: free
```

---

### PHASE 5: Post-Deployment Steps

1. **Run Database Migrations**
   
   If migrations didn't run automatically:
   
   - Go to backend service
   - Click "Shell" tab (or use Render Dashboard)
   - Run:
     ```bash
     npm run migrate
     ```

2. **Verify Database**
   
   Connect to PostgreSQL:
   - Use PgAdmin or TablePlus
   - Connect with External Database URL
   - Check tables exist:
     - users
     - time_slots (15 rows)
     - adverts
     - daily_slot_assignments

3. **Test Login**
   
   - Open frontend URL
   - Login with:
     - Email: `admin@afrogazette.com`
     - Password: `Admin@123`
   - ⚠️ **Change password immediately!**

4. **Create First Sales Rep**
   
   - Login as admin
   - Go to Users page
   - Create new sales rep account
   - Test login with sales rep

5. **Test Complete Workflow**
   
   As Sales Rep:
   - Create a test advert
   - Verify it shows as "Pending"
   
   As Admin:
   - Go to Pending Approvals
   - Select the advert
   - Choose a time slot
   - Approve
   
   Verify:
   - Advert moves to "Active"
   - Shows in schedule
   - Remaining days calculated

---

### PHASE 6: Environment-Specific Settings

#### Free Tier Limitations

Render Free Tier:
- Backend sleeps after 15 min inactivity
- Database: 90 days free, then $7/month
- Static sites: Always free

**Solutions:**
- Upgrade to paid plan ($7/month) for always-on
- Use external cron service to ping `/health` every 10 min
- Accept cold start delay (10-30 seconds)

#### Production Optimizations

1. **Enable Auto-Deploy**
   - Settings > Build & Deploy
   - Enable "Auto-Deploy: Yes"

2. **Health Checks**
   - Settings > Health & Alerts
   - Health Check Path: `/health`

3. **Custom Domain** (Optional)
   - Settings > Custom Domain
   - Add your domain
   - Update CORS accordingly

---

### PHASE 7: Monitoring & Maintenance

1. **Check Logs Regularly**
   
   Backend:
   - Look for cron job execution (daily at midnight)
   - Database connection errors
   - API request errors

2. **Database Backups**
   
   - Render auto-backs up paid databases
   - For free tier: Export data weekly
   - Tools > Backup

3. **Update Dependencies**
   
   Every 2-3 months:
   ```bash
   npm update
   npm audit fix
   ```

4. **Monitor Usage**
   
   - Analytics tab shows:
     - Request count
     - Response times
     - Error rates

---

### Troubleshooting Common Issues

#### 1. Backend Won't Start

**Error:** "Cannot connect to database"

**Solution:**
- Verify DATABASE_URL is correct
- Check database is running
- Ensure SSL is configured: `?ssl=true` or `?sslmode=require`

#### 2. Migrations Fail

**Error:** "Relation already exists"

**Solution:**
- Database might have old data
- Drop all tables and re-run migration
- Or use fresh database

#### 3. Frontend Shows CORS Error

**Error:** "Access to XMLHttpRequest blocked by CORS"

**Solution:**
- Check FRONTEND_URL in backend matches exactly
- Include protocol: `https://`, not just domain
- Redeploy backend after changing

#### 4. "Token Invalid" After Login

**Solution:**
- Clear browser localStorage
- Check JWT_SECRET is set
- Ensure backend didn't redeploy (tokens invalidated)

#### 5. Cron Jobs Not Running

**Solution:**
- Check backend logs for cron execution
- Ensure backend is running (not sleeping)
- Free tier sleeps - upgrade or ping regularly

---

### Quick Reference - URLs

After deployment, you'll have:

```
Database: 
postgresql://user:pass@host/database

Backend: 
https://afrogazette-backend.onrender.com

Frontend: 
https://afrogazette-frontend.onrender.com

Health Check:
https://afrogazette-backend.onrender.com/health

Admin Login:
Email: admin@afrogazette.com
Password: Admin@123 (CHANGE THIS!)
```

---

### Support Checklist

Before asking for help, verify:

- [ ] Database is running and accessible
- [ ] Backend shows "running" status
- [ ] Migrations completed successfully
- [ ] All environment variables set correctly
- [ ] Frontend built without errors
- [ ] Can access /health endpoint
- [ ] Checked logs for specific error messages

---

### Next Steps

1. Change default admin password
2. Create sales rep accounts
3. Test complete workflow
4. Set up monitoring
5. Configure backups
6. Add custom domain (optional)

🎉 **Congratulations! Your AfroGazette system is now live!**
