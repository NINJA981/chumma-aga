/**
 * Simple In-Memory Leaderboard (replaces Redis)
 * For production, consider using Redis or a proper cache
 */

// Store: Map<orgId, Map<repId, xp>>
const leaderboards = new Map<string, Map<string, number>>();

/**
 * Get or create org leaderboard
 */
function getOrgLeaderboard(orgId: string): Map<string, number> {
    if (!leaderboards.has(orgId)) {
        leaderboards.set(orgId, new Map());
    }
    return leaderboards.get(orgId)!;
}

/**
 * Update a rep's XP score
 */
export async function updateLeaderboardScore(
    orgId: string,
    repId: string,
    xpDelta: number
): Promise<number> {
    const lb = getOrgLeaderboard(orgId);
    const currentXp = lb.get(repId) || 0;
    const newXp = currentXp + xpDelta;
    lb.set(repId, newXp);
    return newXp;
}

/**
 * Set absolute score
 */
export async function setLeaderboardScore(
    orgId: string,
    repId: string,
    xp: number
): Promise<void> {
    const lb = getOrgLeaderboard(orgId);
    lb.set(repId, xp);
}

/**
 * Get top N rankings for an org
 */
export async function getTopRankings(
    orgId: string,
    count: number = 10
): Promise<{ repId: string; xp: number; rank: number }[]> {
    const lb = getOrgLeaderboard(orgId);

    const sorted = Array.from(lb.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, count);

    return sorted.map(([repId, xp], index) => ({
        repId,
        xp,
        rank: index + 1,
    }));
}

/**
 * Get a rep's current rank
 */
export async function getRepRank(orgId: string, repId: string): Promise<number | null> {
    const rankings = await getTopRankings(orgId, 1000);
    const found = rankings.find((r) => r.repId === repId);
    return found ? found.rank : null;
}

/**
 * Get a rep's current XP
 */
export async function getRepScore(orgId: string, repId: string): Promise<number | null> {
    const lb = getOrgLeaderboard(orgId);
    return lb.get(repId) || null;
}

/**
 * Remove a rep from leaderboard
 */
export async function removeFromLeaderboard(orgId: string, repId: string): Promise<void> {
    const lb = getOrgLeaderboard(orgId);
    lb.delete(repId);
}

/**
 * Cache helpers (simple in-memory)
 */
const cache = new Map<string, { value: any; expires: number }>();

export async function cacheSet(key: string, value: any, expirySeconds: number = 300): Promise<void> {
    cache.set(key, {
        value,
        expires: Date.now() + expirySeconds * 1000,
    });
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
        cache.delete(key);
        return null;
    }
    return item.value as T;
}

export async function cacheDelete(key: string): Promise<void> {
    cache.delete(key);
}

/**
 * Health check (always true for in-memory)
 */
export async function checkRedisConnection(): Promise<boolean> {
    return true;
}

/**
 * Cleanup (no-op for in-memory)
 */
export async function closeRedisConnection(): Promise<void> {
    console.log('In-memory cache cleared');
}
