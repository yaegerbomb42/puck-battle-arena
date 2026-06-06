// migrate_firebase_to_sqlite.js - Data migration script from Firebase Firestore to local SQLite
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const admin = require('firebase-admin');
const sqliteDb = require('./db');
const bcrypt = require('bcrypt');

// Column translation map (camelCase frontend to snake_case db)
const COLUMN_MAP = {
    equippedIcon: 'equipped_icon',
    equippedPuckId: 'equipped_puck_id',
    freePacks: 'free_packs',
    banUntil: 'ban_until',
    consecutiveQuits: 'consecutive_quits',
    timePlayed: 'time_played',
    activeLoadout: 'active_loadout',
    isPro: 'is_pro',
    proExpiry: 'pro_expiry',
    lastProReward: 'last_pro_reward',
    isLegacy: 'is_legacy',
    lastLogin: 'last_login',
    createdAt: 'created_at',
    onlineStatus: 'online_status',
    lastSeen: 'last_seen',
    isAdmin: 'is_admin',
    claimedSeasonRewards: 'claimed_season_rewards',
    dailyQuests: 'daily_quests',
    lastQuestReset: 'last_quest_reset',
    rankPoints: 'rank_points'
};

// Initialize Firebase Admin
if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.error('❌ Error: FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is missing.');
    process.exit(1);
}

try {
    const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
    );
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Connected to Firebase Admin');
} catch (err) {
    console.error('❌ Failed to initialize Firebase Admin:', err.message);
    process.exit(1);
}

const db = admin.firestore();

async function migrate() {
    console.log('🚀 Starting Firebase to SQLite data migration...');

    try {
        // --- 1. Migrate Users & User Pucks ---
        console.log('👥 Fetching users from Firestore...');
        const usersSnapshot = await db.collection('users').get();
        console.log(`Found ${usersSnapshot.size} users in Firestore.`);

        let migratedUsersCount = 0;
        let migratedPucksCount = 0;

        for (const doc of usersSnapshot.docs) {
            const uid = doc.id;
            const data = doc.data();
            const email = data.email || `${uid}@puckoff.tech`;

            console.log(`  👤 Processing user: ${email} (${uid})`);

            // Check if user already exists in SQLite
            const existingUser = sqliteDb.prepare('SELECT uid FROM users WHERE uid = ?').get(uid);
            if (existingUser) {
                console.log(`    ⚠️ User ${email} already exists in SQLite, skipping user insertion.`);
            } else {
                // Since Firebase password hashes are not directly accessible, we set a temporary bcrypt hash.
                // Users can reset their password, or we can use email confirmation if reset is clicked.
                const randomPassword = 'migrated_' + Math.random().toString(36).substring(2, 15);
                const passwordHash = await bcrypt.hash(randomPassword, 10);

                // Flatten inventory fields if they are nested under 'inventory'
                const inventory = data.inventory || {};
                const combinedData = {
                    ...data,
                    ...inventory
                };

                const sqlColumns = ['uid', 'email', 'password_hash'];
                const sqlPlaceholders = ['?', '?', '?'];
                const sqlValues = [uid, email, passwordHash];

                // Fetch database columns to verify
                const pragma = sqliteDb.prepare("PRAGMA table_info(users)").all();
                const columnNames = pragma.map(c => c.name);

                for (const [key, val] of Object.entries(combinedData)) {
                    if (key === 'email' || key === 'uid' || key === 'inventory') continue;

                    const dbColumn = COLUMN_MAP[key] || key;
                    
                    if (!columnNames.includes(dbColumn)) {
                        continue; // Skip fields that aren't in SQLite users schema
                    }

                    sqlColumns.push(dbColumn);
                    sqlPlaceholders.push('?');

                    if (typeof val === 'boolean') {
                        sqlValues.push(val ? 1 : 0);
                    } else if (Array.isArray(val) || (val && typeof val === 'object')) {
                        sqlValues.push(JSON.stringify(val));
                    } else {
                        sqlValues.push(val);
                    }
                }

                const query = `
                    INSERT INTO users (${sqlColumns.join(', ')})
                    VALUES (${sqlPlaceholders.join(', ')})
                `;
                sqliteDb.prepare(query).run(...sqlValues);
                migratedUsersCount++;
            }

            // Fetch and migrate user pucks subcollection
            const pucksSnapshot = await db.collection('users').doc(uid).collection('pucks').get();
            for (const puckDoc of pucksSnapshot.docs) {
                const puckId = puckDoc.id;
                const puckData = puckDoc.data();

                const existingPuck = sqliteDb.prepare('SELECT id FROM pucks WHERE id = ?').get(puckId);
                if (existingPuck) {
                    continue; // Skip
                }

                sqliteDb.prepare(`
                    INSERT INTO pucks (id, user_id, icon_id, tier, xp, stats, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    puckId,
                    uid,
                    puckData.iconId || 1001,
                    puckData.tier || 0,
                    puckData.xp || 0,
                    JSON.stringify(puckData.stats || puckData || {}),
                    puckData.createdAt || new Date().toISOString()
                );
                migratedPucksCount++;
            }
        }

        console.log(`✅ User migration finished. Migrated users: ${migratedUsersCount}, pucks: ${migratedPucksCount}`);

        // --- 2. Migrate Payments ---
        console.log('💳 Fetching payments from Firestore...');
        let migratedPaymentsCount = 0;
        try {
            const paymentsSnapshot = await db.collection('payments').get();
            for (const payDoc of paymentsSnapshot.docs) {
                const payId = payDoc.id;
                const payData = payDoc.data();

                const existingPayment = sqliteDb.prepare('SELECT id FROM payments WHERE id = ?').get(payId);
                if (existingPayment) continue;

                sqliteDb.prepare(`
                    INSERT INTO payments (id, user_id, email, pack_type, amount, timestamp, status, method)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    payId,
                    payData.userId || payData.uid || 'unknown',
                    payData.email || 'unknown',
                    payData.packType || 'unknown',
                    payData.amount || 0,
                    payData.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
                    payData.status || 'completed',
                    payData.method || 'admin_bypass'
                );
                migratedPaymentsCount++;
            }
            console.log(`✅ Payments migration finished. Migrated: ${migratedPaymentsCount}`);
        } catch (err) {
            console.warn('⚠️ Payments migration encountered an error (collection might not exist):', err.message);
        }

        // --- 3. Migrate Notifications ---
        console.log('🔔 Fetching notifications from Firestore...');
        let migratedNotificationsCount = 0;
        try {
            const notificationsSnapshot = await db.collection('notifications').get();
            for (const notifDoc of notificationsSnapshot.docs) {
                const notifId = notifDoc.id;
                const notifData = notifDoc.data();

                const existingNotif = sqliteDb.prepare('SELECT id FROM notifications WHERE id = ?').get(notifId);
                if (existingNotif) continue;

                sqliteDb.prepare(`
                    INSERT INTO notifications (id, target_uid, from_uid, from_name, type, data, timestamp, read)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    notifId,
                    notifData.targetUid || notifData.target_uid,
                    notifData.fromUid || notifData.from_uid || null,
                    notifData.fromName || notifData.from_name || null,
                    notifData.type || 'info',
                    JSON.stringify(notifData.data || {}),
                    notifData.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
                    notifData.read ? 1 : 0
                );
                migratedNotificationsCount++;
            }
            console.log(`✅ Notifications migration finished. Migrated: ${migratedNotificationsCount}`);
        } catch (err) {
            console.warn('⚠️ Notifications migration encountered an error (collection might not exist):', err.message);
        }

        // --- 4. Migrate Global Stats ---
        console.log('📊 Fetching global stats from Firestore...');
        try {
            const statsDoc = await db.collection('stats').doc('global').get();
            if (statsDoc.exists) {
                const statsData = statsDoc.data();
                if (statsData.totalTimePlayedSeconds !== undefined) {
                    sqliteDb.prepare("INSERT OR REPLACE INTO global_stats (key, value) VALUES ('totalTimePlayedSeconds', ?)")
                        .run(statsData.totalTimePlayedSeconds.toString());
                    console.log(`✅ Global stats migrated: totalTimePlayedSeconds = ${statsData.totalTimePlayedSeconds}`);
                }
            }
        } catch (err) {
            console.warn('⚠️ Global stats migration encountered an error:', err.message);
        }

        console.log('🎉 Database migration completed successfully!');
    } catch (err) {
        console.error('❌ Database migration failed:', err);
    } finally {
        sqliteDb.close();
    }
}

migrate();
