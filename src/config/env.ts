import dotenv from 'dotenv';

dotenv.config({
    path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.local',
});

const requiredVars = [
    'PG_HOST', 'PG_PORT', 'PG_USER', 'PG_PASSWORD', 'PG_DATABASE',
    'MONGO_URI', 'HEALTH_KEY', 'PORT'
];

for (const v of requiredVars) {
    if (!process.env[v]) {
        throw new Error(`Missing required environment variable: ${v}`);
    }
}

export const ENV = process.env as Record<string, string>;
