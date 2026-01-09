
import Redis from 'ioredis';
import { config } from './env.js';

/**
 * Redis Configuration
 * Uses ioredis for Redis functionality with in-memory fallback
 */

let redis: Redis | null = null;
// Check for REDIS_URL in env (not in config object explicitly, so check process.env or add to schema)
// env.ts schema didn't have REDIS_URL. I should probably add it or just check process.env here.
const REDIS_URL = process.env.REDIS_URL;

if (REDIS_URL) {
    console.log('🔌 Connecting to Redis...');
    redis = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            if (times > 3) {
                console.warn('⚠️ Redis connection failed, falling back to in-memory');
                return null; // Stop retrying
            }
            return Math.min(times * 50, 2000);
        }
    });

    redis.on('error', (err) => {
        // Only log if we haven't switched to fallback mode conceptually (though redis instance exists)
        console.warn('Redis Error:', err.message);
    });

    redis.on('connect', () => {
        console.log('✅ Redis connected');
    });
} else {
    console.log('⚠️ REDIS_URL not set, using in-memory storage');
}

// In-Memory Fallback Storage
const localLeaderboards = new Map<string, Map<string, number>>();
const localCache = new Map<string, { value: any; expires: number }>();

function getLocalLb(orgId: string) {
    if (!localLeaderboards.has(orgId)) {
        localLeaderboards.set(orgId, new Map());
    }
    return localLeaderboards.get(orgId)!;
}

// ==========================================
// LEADERBOARD FUNCTIONS
// ==========================================

export async function updateLeaderboardScore(
    orgId: string,
    repId: string,
    xpDelta: number
): Promise<number> {
    if (redis && redis.status === 'ready') {
        const key = `leaderboard:${orgId}`;
        const newScore = await redis.zincrby(key, xpDelta, repId);
        return parseFloat(newScore);
    }

    // Fallback
    const lb = getLocalLb(orgId);
    const currentXp = lb.get(repId) || 0;
    const newXp = currentXp + xpDelta;
    lb.set(repId, newXp);
    return newXp;
}

export async function setLeaderboardScore(
    orgId: string,
    repId: string,
    xp: number
): Promise<void> {
    if (redis && redis.status === 'ready') {
        const key = `leaderboard:${orgId}`;
        await redis.zadd(key, xp, repId);
        return;
    }

    // Fallback
    const lb = getLocalLb(orgId);
    lb.set(repId, xp);
}

export async function getTopRankings(
    orgId: string,
    count: number = 10
): Promise<{ repId: string; xp: number; rank: number }[]> {
    if (redis && redis.status === 'ready') {
        const key = `leaderboard:${orgId}`;
        // Get top N with scores
        const results = await redis.zrevrange(key, 0, count - 1, 'WITHSCORES');

        const rankings: { repId: string; xp: number; rank: number }[] = [];
        for (let i = 0; i < results.length; i += 2) {
            rankings.push({
                repId: results[i],
                xp: parseFloat(results[i + 1]),
                rank: (i / 2) + 1
            });
        }
        return rankings;
    }

    // Fallback
    const lb = getLocalLb(orgId);
    const sorted = Array.from(lb.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count);

    return sorted.map(([repId, xp], index) => ({
        repId,
        xp,
        rank: index + 1,
    }));
}

export async function getRepRank(orgId: string, repId: string): Promise<number | null> {
    if (redis && redis.status === 'ready') {
        const key = `leaderboard:${orgId}`;
        const rank = await redis.zrevrank(key, repId);
        return rank === null ? null : rank + 1; // Redis is 0-indexed
    }

    // Fallback
    const rankings = await getTopRankings(orgId, 1000);
    const found = rankings.find((r) => r.repId === repId);
    return found ? found.rank : null;
}

export async function getRepScore(orgId: string, repId: string): Promise<number | null> {
    if (redis && redis.status === 'ready') {
        const key = `leaderboard:${orgId}`;
        const score = await redis.zscore(key, repId);
        return score ? parseFloat(score) : null;
    }

    // Fallback
    const lb = getLocalLb(orgId);
    return lb.get(repId) || null;
}

export async function removeFromLeaderboard(orgId: string, repId: string): Promise<void> {
    if (redis && redis.status === 'ready') {
        const key = `leaderboard:${orgId}`;
        await redis.zrem(key, repId);
        return;
    }

    // Fallback
    const lb = getLocalLb(orgId);
    lb.delete(repId);
}

// ==========================================
// CACHE FUNCTIONS
// ==========================================

export async function cacheSet(key: string, value: any, expirySeconds: number = 300): Promise<void> {
    if (redis && redis.status === 'ready') {
        await redis.setex(key, expirySeconds, JSON.stringify(value));
        return;
    }

    // Fallback
    localCache.set(key, {
        value,
        expires: Date.now() + expirySeconds * 1000,
    });
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
    if (redis && redis.status === 'ready') {
        const data = await redis.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data) as T;
        } catch {
            return null;
        }
    }

    // Fallback
    const item = localCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
        localCache.delete(key);
        return null;
    }
    return item.value as T;
}

export async function cacheDelete(key: string): Promise<void> {
    if (redis && redis.status === 'ready') {
        await redis.del(key);
        return;
    }

    // Fallback
    localCache.delete(key);
}

export async function checkRedisConnection(): Promise<boolean> {
    if (redis) {
        return redis.status === 'ready';
    }
    return true; // Fallback is always ready
}

export async function closeRedisConnection(): Promise<void> {
    if (redis) {
        await redis.quit();
    }
    localLeaderboards.clear();
    localCache.clear();
}
