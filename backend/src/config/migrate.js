const pool = require('./database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create ENUM types
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'sales_rep');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE advert_status AS ENUM ('pending', 'active', 'expired', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE advert_category AS ENUM (
          'automotive', 'real_estate', 'fashion', 'food_beverage', 
          'technology', 'health_wellness', 'education', 'entertainment',
          'finance', 'travel', 'sports', 'beauty', 'home_garden', 'other'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role user_role NOT NULL DEFAULT 'sales_rep',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Time slots table (06:00 to 20:00)
    await client.query(`
      CREATE TABLE IF NOT EXISTS time_slots (
        id SERIAL PRIMARY KEY,
        slot_time TIME NOT NULL UNIQUE,
        slot_label VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Adverts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS adverts (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) NOT NULL,
        category advert_category NOT NULL,
        caption TEXT NOT NULL,
        media_url VARCHAR(500),
        days_paid INTEGER NOT NULL CHECK (days_paid > 0),
        payment_date DATE NOT NULL,
        amount_paid DECIMAL(10, 2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        status advert_status NOT NULL DEFAULT 'pending',
        assigned_slot_id INTEGER REFERENCES time_slots(id),
        sales_rep_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        approved_by INTEGER REFERENCES users(id),
        approved_at TIMESTAMP,
        remaining_days INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Daily slot assignments table - tracks which adverts are in which slots on which days
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_slot_assignments (
        id SERIAL PRIMARY KEY,
        advert_id INTEGER NOT NULL REFERENCES adverts(id) ON DELETE CASCADE,
        slot_id INTEGER NOT NULL REFERENCES time_slots(id),
        assignment_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(slot_id, assignment_date, advert_id)
      )
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_adverts_status ON adverts(status);
      CREATE INDEX IF NOT EXISTS idx_adverts_sales_rep ON adverts(sales_rep_id);
      CREATE INDEX IF NOT EXISTS idx_adverts_start_date ON adverts(start_date);
      CREATE INDEX IF NOT EXISTS idx_daily_assignments_date ON daily_slot_assignments(assignment_date);
      CREATE INDEX IF NOT EXISTS idx_daily_assignments_slot ON daily_slot_assignments(slot_id, assignment_date);
    `);

    // Insert default time slots (06:00 to 20:00, hourly)
    const slots = [
      { time: '06:00:00', label: '06:00 AM' },
      { time: '07:00:00', label: '07:00 AM' },
      { time: '08:00:00', label: '08:00 AM' },
      { time: '09:00:00', label: '09:00 AM' },
      { time: '10:00:00', label: '10:00 AM' },
      { time: '11:00:00', label: '11:00 AM' },
      { time: '12:00:00', label: '12:00 PM' },
      { time: '13:00:00', label: '01:00 PM' },
      { time: '14:00:00', label: '02:00 PM' },
      { time: '15:00:00', label: '03:00 PM' },
      { time: '16:00:00', label: '04:00 PM' },
      { time: '17:00:00', label: '05:00 PM' },
      { time: '18:00:00', label: '06:00 PM' },
      { time: '19:00:00', label: '07:00 PM' },
      { time: '20:00:00', label: '08:00 PM' }
    ];

    for (const slot of slots) {
      await client.query(`
        INSERT INTO time_slots (slot_time, slot_label)
        VALUES ($1, $2)
        ON CONFLICT (slot_time) DO NOTHING
      `, [slot.time, slot.label]);
    }

    // Create default admin user (password: Admin@123)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    await client.query(`
      INSERT INTO users (email, password, full_name, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@afrogazette.com', hashedPassword, 'System Administrator', 'admin']);

    await client.query('COMMIT');
    console.log('✅ Database tables created successfully!');
    console.log('✅ Default time slots inserted (06:00 - 20:00)');
    console.log('✅ Default admin user created:');
    console.log('   Email: admin@afrogazette.com');
    console.log('   Password: Admin@123');
    console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

createTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
