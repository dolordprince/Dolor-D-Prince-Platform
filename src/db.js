const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Auto-create all tables on startup
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        fullname TEXT NOT NULL,
        phone TEXT,
        wallet_balance NUMERIC DEFAULT 0,
        is_admin BOOLEAN DEFAULT FALSE,
        is_banned BOOLEAN DEFAULT FALSE,
        is_verified BOOLEAN DEFAULT FALSE,
        email_otp TEXT,
        email_otp_expiry TIMESTAMPTZ,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        reference TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        description TEXT,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        external_id TEXT,
        service TEXT NOT NULL,
        country TEXT DEFAULT 'nigeria',
        phone TEXT,
        price NUMERIC NOT NULL,
        status TEXT DEFAULT 'pending',
        otp TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_txn_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_txn_ref ON transactions(reference);
      CREATE INDEX IF NOT EXISTS idx_ord_user ON orders(user_id);
    `);

    // Create default admin (only if no admin exists)
    await client.query(`
      INSERT INTO users (email, password_hash, fullname, is_admin, is_verified, wallet_balance)
      VALUES ('admin@dolordprince.com', encode('Admin@1234'::bytea, 'base64'), 'David Prince', TRUE, TRUE, 0)
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('DB init error:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
