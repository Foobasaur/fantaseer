import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/lib/server/db/.sql',
  out: './out/drizzle',
  dialect: 'postgresql', // 'mysql' | 'sqlite' | 'turso'
  verbose: true,
  strict: true,
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://root:mysecretpassword@localhost:5433/local'
    // ssl: { rejectUnauthorized: false } // tunnel terminates locally, cert won't match localhost
    // ssl: process.env.DB_LOCAL_TUNNEL !== '1'
  }
});
