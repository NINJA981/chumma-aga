import { db, pgToSqlite, query, closeDatabase } from '../src/config/database';
import { config } from '../src/config/env';

// Mock config for standalone run if needed (env might be loaded from src/config/env)
// We need to ensure we point to the same DB file.
console.log('📂 Database Path:', config.database.sqlitePath);

try {
    // 1. Check basic counts
    console.log('\n--- 📊 Basic Counts ---');
    const orgs = query('SELECT COUNT(*) as c FROM organizations')[0].c;
    const users = query('SELECT COUNT(*) as c FROM users')[0].c;
    const calls = query('SELECT COUNT(*) as c FROM calls')[0].c;

    console.log(`Organizations: ${orgs}`);
    console.log(`Users: ${users}`);
    console.log(`Calls: ${calls}`);

    if (calls === 0) {
        console.error('❌ No calls found! Seeding failed or DB path mismatch.');
        process.exit(1);
    }

    // 2. Simulate Analytics Query
    console.log('\n--- 🕵️ Testing Analytics Query ---');

    // Get an org ID
    const org = query('SELECT id FROM organizations LIMIT 1')[0];
    if (!org) throw new Error('No org found');
    console.log(`Using Org ID: ${org.id}`);

    const days = 30;
    const rawSql = `SELECT 
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE is_answered) as answered_calls,
        COALESCE(SUM(duration_seconds), 0) as total_talk_seconds,
        COUNT(*) FILTER (WHERE disposition = 'converted') as conversions
       FROM calls
       WHERE org_id = $1 AND started_at > NOW() - INTERVAL '${days} days'`;

    console.log('\nOriginal SQL:');
    console.log(rawSql);

    const convertedSql = pgToSqlite(rawSql);
    console.log('\nConverted SQL:');
    console.log(convertedSql);

    const stats = query(convertedSql, [org.id]);
    console.log('\nQuery Result:');
    console.log(stats);

    // 3. Test Rep Stats Query (Complex Header)
    console.log('\n--- 🕵️ Testing Rep Stats Query ---');
    const repSql = `SELECT 
        u.id, u.first_name, u.last_name, u.avatar_url,
        COUNT(c.id) as total_calls,
        COUNT(c.id) FILTER (WHERE c.is_answered) as answered_calls,
        COALESCE(SUM(c.duration_seconds), 0) as total_talk_seconds,
        COALESCE(AVG(c.duration_seconds) FILTER (WHERE c.is_answered), 0) as avg_call_duration,
        COUNT(c.id) FILTER (WHERE c.disposition = 'converted') as conversions
       FROM users u
       LEFT JOIN calls c ON c.rep_id = u.id AND c.started_at > NOW() - INTERVAL '${days} days'
       WHERE u.org_id = $1 AND u.role = 'rep'
       GROUP BY u.id
       ORDER BY total_calls DESC`;

    const convertedRepSql = pgToSqlite(repSql);
    console.log('\nConverted Rep SQL:');
    console.log(convertedRepSql);

    const repStats = query(convertedRepSql, [org.id]);
    console.log('\nRep Stats Result (First 2):');
    console.log(repStats.slice(0, 2));

} catch (error) {
    console.error('❌ Error:', error);
} finally {
    closeDatabase();
}
