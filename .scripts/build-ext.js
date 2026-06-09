import { execSync } from 'child_process';
import { renameSync, existsSync } from 'fs';


process.env.DATABASE_URL = '';
process.env.VITE_TARGET = 'extension';
process.env.VITE_EBS_URL = 'https://d2lmitypqnq5o0.cloudfront.net';
const rewinder = [
  { dir: 'src/routes/api', back: 'src/.api-bak' }
];
try {
  // Hash routing doesn't allow +server.ts — move API routes out for extension build
  // for (const { dir, back } of rewinder) {
  //   if (existsSync(dir)) renameSync(dir, back);
  // }
  execSync('vite build', { stdio: 'inherit', env: process.env });
} finally {
  // Always restore API routes
  // for (const { dir, back } of rewinder) {
  //   if (existsSync(back)) renameSync(back, dir);
  // }
}
