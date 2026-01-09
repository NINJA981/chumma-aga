import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();


const envSchema = z.object({
    PORT: z.string().default('3001'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SQLITE_PATH: z.string().default('./data/vocalpulse.db'),
    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default('7d'),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    CALLYZER_SIGNING_SECRET: z.string().optional(),
    FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
}

export const config = {
    port: parseInt(parsed.data.PORT, 10),
    nodeEnv: parsed.data.NODE_ENV,
    isProduction: parsed.data.NODE_ENV === 'production',
    isDevelopment: parsed.data.NODE_ENV === 'development',

    database: {
        sqlitePath: parsed.data.SQLITE_PATH,
    },

    jwt: {
        secret: parsed.data.JWT_SECRET,
        expiresIn: parsed.data.JWT_EXPIRES_IN as string,
    },

    twilio: {
        accountSid: parsed.data.TWILIO_ACCOUNT_SID,
        authToken: parsed.data.TWILIO_AUTH_TOKEN,
        phoneNumber: parsed.data.TWILIO_PHONE_NUMBER,
    },

    gemini: {
        apiKey: parsed.data.GEMINI_API_KEY,
    },

    callyzer: {
        signingSecret: parsed.data.CALLYZER_SIGNING_SECRET,
    },

    cors: {
        origin: parsed.data.FRONTEND_URL,
    },
};
