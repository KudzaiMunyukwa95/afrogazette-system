const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = require('./config/database');
const { initializeCronJobs, manualUpdate } = require('./services/cronService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const advertRoutes = require('./routes/advertRoutes');
const slotRoutes = require('./routes/slotRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://afrogazette.onrender.com',
      'https://ads.afrogazette.co.zw',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n🚀 ${timestamp} - ${req.method} ${req.path}`);
  console.log('📍 Origin:', req.get('Origin') || 'None');
  console.log('🔑 Headers:', {
    'content-type': req.get('Content-Type'),
    'authorization': req.get('Authorization') ? 'Bearer ***' : 'None'
  });
  if (req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '***';
    console.log('📦 Body:', logBody);
  }
  next();
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AfroGazette API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AfroGazette API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      adverts: '/api/adverts/*',
      slots: '/api/slots/*',
      analytics: '/api/analytics/*'
    }
  });
});

// Test route for API base
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API routes are working',
    availableRoutes: ['/api/auth', '/api/users', '/api/adverts', '/api/slots', '/api/analytics']
  });
});

// TEMPORARY: Password testing route
app.post('/test-password', async (req, res) => {
  try {
    const { password, hash } = req.body;
    console.log('🔧 Testing password comparison...');
    console.log('Password:', password);
    console.log('Hash preview:', hash ? hash.substring(0, 20) + '...' : 'No hash provided');
    
    if (!password || !hash) {
      return res.json({
        success: false,
        message: 'Password and hash required',
        provided: { password: !!password, hash: !!hash }
      });
    }
    
    const isValid = await bcrypt.compare(password, hash);
    console.log('🔑 Comparison result:', isValid);
    
    res.json({
      success: true,
      password: password,
      hashPreview: hash.substring(0, 20) + '...',
      hashLength: hash.length,
      isValid: isValid,
      bcryptVersion: require('bcryptjs/package.json').version
    });
  } catch (error) {
    console.error('❌ Password test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORARY: Manual login test route with detailed debugging
app.post('/test-login-debug', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('\n🔍 MANUAL LOGIN DEBUG');
    console.log('========================');
    console.log('Email:', email);
    console.log('Password provided:', !!password);
    
    // Step 1: Find user
    console.log('1️⃣ Searching for user...');
    const result = await pool.query(
      'SELECT id, email, password, full_name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'User not found',
        step: 'user_lookup'
      });
    }
    
    const user = result.rows[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0
    });
    
    // Step 2: Test password
    console.log('2️⃣ Testing password...');
    console.log('Stored hash preview:', user.password.substring(0, 20) + '...');
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('🔑 Password comparison result:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
      return res.status(401).json({
        success: false,
        message: 'Password verification failed',
        step: 'password_check',
        details: {
          providedPassword: password,
          hashPreview: user.password.substring(0, 20) + '...',
          comparisonResult: isValidPassword
        }
      });
    }
    
    // Step 3: Generate token
    console.log('3️⃣ Generating token...');
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback-secret-for-testing',
      { expiresIn: '7d' }
    );
    
    console.log('✅ Token generated successfully');
    console.log('========================\n');
    
    res.json({
      success: true,
      message: 'Login successful (debug mode)',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('❌ Login debug error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login debug',
      error: error.message
    });
  }
});

// TEMPORARY: Create fresh admin user route
app.post('/create-fresh-admin', async (req, res) => {
  try {
    console.log('🔧 Creating fresh admin user...');
    
    // Delete existing admin
    await pool.query('DELETE FROM users WHERE email = $1', ['admin@afrogazette.com']);
    console.log('🗑️ Deleted existing admin');
    
    // Create fresh hash
    const password = 'Admin@123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('🔑 Generated fresh hash:', hashedPassword.substring(0, 20) + '...');
    
    // Insert new admin
    const result = await pool.query(
      `INSERT INTO users (email, password, full_name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, role`,
      ['admin@afrogazette.com', hashedPassword, 'Default Admin', 'admin']
    );
    
    const newUser = result.rows[0];
    console.log('✅ Fresh admin created:', newUser);
    
    // Test the hash immediately
    const testResult = await bcrypt.compare(password, hashedPassword);
    console.log('🧪 Immediate hash test:', testResult);
    
    res.json({
      success: true,
      message: 'Fresh admin user created',
      data: {
        user: newUser,
        hashTest: testResult,
        hashPreview: hashedPassword.substring(0, 20) + '...'
      }
    });
  } catch (error) {
    console.error('❌ Create fresh admin error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Routes with error handling
console.log('🔧 Mounting API routes...');

try {
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted');
} catch (error) {
  console.error('❌ Failed to mount auth routes:', error.message);
}

try {
  app.use('/api/users', userRoutes);
  console.log('✅ User routes mounted');
} catch (error) {
  console.error('❌ Failed to mount user routes:', error.message);
}

try {
  app.use('/api/adverts', advertRoutes);
  console.log('✅ Advert routes mounted');
} catch (error) {
  console.error('❌ Failed to mount advert routes:', error.message);
}

try {
  app.use('/api/slots', slotRoutes);
  console.log('✅ Slot routes mounted');
} catch (error) {
  console.error('❌ Failed to mount slot routes:', error.message);
}

try {
  app.use('/api/analytics', analyticsRoutes);
  console.log('✅ Analytics routes mounted');
} catch (error) {
  console.error('❌ Failed to mount analytics routes:', error.message);
}

// Manual update endpoint (for testing)
app.post('/api/adverts/manual-update', async (req, res) => {
  try {
    console.log('🔧 Manual advert update triggered via API');
    const result = await manualUpdate();
    
    res.json({
      success: true,
      message: 'Adverts updated successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Manual update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update adverts',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /health',
      'GET /api',
      'POST /api/auth/login',
      'POST /api/adverts/manual-update',
      'POST /test-login-debug',
      'POST /create-fresh-admin'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server with comprehensive testing
const startServer = async () => {
  try {
    // Test database connection
    console.log('\n🔄 Starting AfroGazette API Server...');
    console.log('==================================');
    console.log('1️⃣ Testing database connection...');
    
    const dbTest = await pool.query('SELECT NOW() as current_time, version()');
    console.log('✅ Database connected:', dbTest.rows[0].current_time);
    console.log('📊 Database version:', dbTest.rows[0].version.split(' ')[0]);
    
    // Check users table
    console.log('\n2️⃣ Checking users table...');
    try {
      const usersCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log('👥 Total users:', usersCount.rows[0].count);
      
      const adminCheck = await pool.query(
        'SELECT id, email, role, length(password) as pwd_len FROM users WHERE email = $1',
        ['admin@afrogazette.com']
      );
      
      if (adminCheck.rows.length > 0) {
        const admin = adminCheck.rows[0];
        console.log('👨‍💼 Admin user found:', {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          passwordLength: admin.pwd_len
        });
      } else {
        console.log('⚠️  Admin user NOT found');
      }
    } catch (tableError) {
      console.log('⚠️  Users table issue:', tableError.message);
    }
    
    // Test JWT secret
    console.log('\n3️⃣ Checking JWT configuration...');
    const jwtSecret = process.env.JWT_SECRET;
    console.log('🔐 JWT Secret:', jwtSecret ? 'Set (' + jwtSecret.length + ' chars)' : 'NOT SET - using fallback');
    
    // Initialize cron jobs
    console.log('\n4️⃣ Initializing cron jobs...');
    initializeCronJobs();
    
    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 ====================================');
      console.log(`   AfroGazette API Server RUNNING`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Database: Connected`);
      console.log(`   Cron Jobs: Active`);
      console.log(`   API Base: /api`);
      console.log(`   Debug Routes: /test-login-debug, /create-fresh-admin`);
      console.log('🚀 ====================================\n');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
