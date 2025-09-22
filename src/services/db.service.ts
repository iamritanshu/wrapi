import mongoose from 'mongoose';
import { Pool } from 'pg';
import { ENV } from '../config/env';

let pool: Pool; 

export const connectPostgres = async (attempt = 1): Promise<Pool> => {
    try {
        pool = new Pool({
            host: ENV.PG_HOST,
            port: Number(ENV.PG_PORT),
            user: ENV.PG_USER,
            password: ENV.PG_PASSWORD.trim(),
            database: ENV.PG_DATABASE,
        });

        await pool.query('SELECT 1');
        console.log('PostgreSQL connected successfully.');
        return pool;
    } catch (err: any) {
        const delay = Math.min(30000, attempt * 5000);
        console.error(`Postgres connection failed (Attempt ${attempt}):`, err.message);
        console.log(`Retrying Postgres in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        return connectPostgres(attempt + 1);
    }
};

let mongoConnection: mongoose.Connection;

export const connectMongo = async (uri: string, attempt = 1): Promise<void> => {
    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
        });
        mongoConnection = mongoose.connection;
        console.log('MongoDB connected successfully.');
    } catch (err: any) {
        const delay = Math.min(30000, attempt * 5000);
        console.error(`MongoDB connection failed (Attempt ${attempt}):`, err.message);
        console.log(`Retrying Mongo in ${delay / 1000}s...`);
        await new Promise(r => setTimeout(r, delay));
        return connectMongo(uri, attempt + 1);
    }
};

export const connectDatabases = async () => {
    await connectPostgres();
    await connectMongo(ENV.MONGO_URI);
    return { pool, mongo: mongoConnection };
};

export { pool, mongoConnection as mongo };
