import mongoose from 'mongoose';
import { config } from './env.js';

// Database connection
export const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(config.database.url || 'mongodb://127.0.0.1:27017/vocalpulse');
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`❌ Error: ${error.message}`);
        process.exit(1);
    }
};

export const closeDatabase = async (): Promise<void> => {
    await mongoose.connection.close();
};

// Re-export Mongoose for convenience
export { mongoose };
