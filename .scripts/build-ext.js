import { execSync } from 'child_process';

process.env.VITE_TARGET = 'extension';
process.env.VITE_EBS_URL = 'https://d2lmitypqnq5o0.cloudfront.net';
process.env.DATABASE_URL = 'postgres://root:mysecretpassword@localhost:5433/local';
execSync('vite build', { stdio: 'inherit', env: process.env });
