import mongoose from 'mongoose';
import { Pool } from 'pg';

export const getHealthStatus = async (pgPool: Pool, mongoConn: mongoose.Connection) => {
    const [mongoStatus, pgStatus] = await Promise.all([
        Promise.resolve(mongoConn.readyState === 1),
        pgPool.query('SELECT 1').then(() => true).catch(() => false)
    ]);

    return {
        overall: mongoStatus && pgStatus,
        mongo: { connected: mongoStatus},
        postgres: { connected: pgStatus }
    };
};
