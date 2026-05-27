/// <reference path="./sst-env.d.ts" />
import { defineConfig } from 'drizzle-kit';
import { Resource } from 'sst';

export default defineConfig({
  schema: './src/lib/server/db/.sql',
  dialect: 'postgresql', // 'mysql' | 'sqlite' | 'turso'
  verbose: true,
  strict: true,
  dbCredentials: {
    host: Resource.MyPostgres.host,
    port: Resource.MyPostgres.port,
    user: Resource.MyPostgres.username,
    password: Resource.MyPostgres.password,
    database: Resource.MyPostgres.database,
    ssl: false
  }
});
