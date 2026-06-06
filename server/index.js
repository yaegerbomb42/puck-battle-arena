require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Load from root .env
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Stripe Setup (Add your keys in .env or replace directly)
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_KEY');
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_YOUR_WEBHOOK_SECRET';

const app = express();

// IMPORTANT: Stripe webhooks need raw body, so this must come BEFORE express.json()
app.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Ping endpoint for keep-alive services (Cron-job.org / UptimeRobot)
app.get('/ping', (req, res) => res.status(200).send('pong'));

// Now apply JSON parsing for other routes
app.use(cors());
app.use(express.json());

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqliteDb = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'puckoff_jwt_secret_2026_frontline';

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

const REVERSE_COLUMN_MAP = {};
for (const [frontendKey, dbColumn] of Object.entries(COLUMN_MAP)) {
    REVERSE_COLUMN_MAP[dbColumn] = frontendKey;
}

function formatUserRow(row) {
    if (!row) return null;
    const formatted = {};
    for (const [key, value] of Object.entries(row)) {
        const frontendKey = REVERSE_COLUMN_MAP[key] || key;

        // Handle boolean conversions
        if (key === 'is_pro' || key === 'is_legacy' || key === 'is_admin') {
            formatted[frontendKey] = value === 1;
            continue;
        }

        // Handle JSON parsing
        if (['following', 'skins', 'loadouts', 'stats', 'achievements', 'claimed_season_rewards', 'daily_quests', 'icons'].includes(key)) {
            try {
                formatted[frontendKey] = JSON.parse(value || (key === 'stats' ? '{}' : '[]'));
            } catch (err) {
                formatted[frontendKey] = key === 'stats' ? {} : [];
            }
            continue;
        }

        formatted[frontendKey] = value;
    }
    return formatted;
}

// Helper to generate UUID
function generateUUID() {
    return 'puck_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// REST endpoints for local SQLite Auth
app.post('/api/auth/register', async (req, res) => {
    const { email, password, username } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Check if user already exists
        const existingUser = sqliteDb.prepare('SELECT uid FROM users WHERE email = ?').get(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email is already registered' });
        }

        const uid = generateUUID();
        const passwordHash = await bcrypt.hash(password, 10);
        const createdAt = new Date().toISOString();

        sqliteDb.prepare(`
            INSERT INTO users (uid, email, password_hash, username, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(uid, email, passwordHash, username || 'PuckPlayer', createdAt, createdAt);

        // Retrieve created user
        const user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(uid);

        // Generate JWT
        const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({ success: true, token, user: formatUserRow(user) });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Failed to create account. Please try again.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Update last login
        const now = new Date().toISOString();
        sqliteDb.prepare('UPDATE users SET last_login = ? WHERE uid = ?').run(now, user.uid);

        // Generate JWT
        const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        // Retrieve updated user
        const updatedUser = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(user.uid);

        res.json({ success: true, token, user: formatUserRow(updatedUser) });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = decoded;
        next();
    });
};

app.get('/api/auth/me', authenticateToken, (req, res) => {
    try {
        const user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(req.user.uid);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ success: true, user: formatUserRow(user) });
    } catch (err) {
        console.error('Token authentication error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

function syncUserInventory(uid) {
    const userSockets = uidToSockets.get(uid);
    if (!userSockets || userSockets.size === 0) return;

    try {
        const user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
        if (user) {
            const formattedUser = formatUserRow(user);
            userSockets.forEach(sId => {
                io.to(sId).emit('inventoryUpdate', formattedUser);
            });
        }
    } catch (err) {
        console.error('Failed to sync user inventory over socket:', err);
    }
}

function syncUserNotifications(uid) {
    const userSockets = uidToSockets.get(uid);
    if (!userSockets || userSockets.size === 0) return;

    try {
        const notifications = sqliteDb.prepare('SELECT * FROM notifications WHERE target_uid = ? ORDER BY timestamp DESC LIMIT 20').all(uid);
        const parsedNotifications = notifications.map(n => ({
            ...n,
            read: n.read === 1,
            data: JSON.parse(n.data || '{}')
        }));

        userSockets.forEach(sId => {
            io.to(sId).emit('notificationUpdate', parsedNotifications);
        });
    } catch (err) {
        console.error('Failed to sync notifications over socket:', err);
    }
}

function syncUserPucks(uid) {
    const userSockets = uidToSockets.get(uid);
    if (!userSockets || userSockets.size === 0) return;

    try {
        const pucks = sqliteDb.prepare('SELECT * FROM pucks WHERE user_id = ?').all(uid);
        const parsedPucks = pucks.map(p => ({
            ...p,
            stats: JSON.parse(p.stats || '{}')
        }));

        userSockets.forEach(sId => {
            io.to(sId).emit('pucksUpdate', parsedPucks);
        });
    } catch (err) {
        console.error('Failed to sync pucks over socket:', err);
    }
}

function applyUserUpdates(uid, updates) {
    const transaction = sqliteDb.transaction(() => {
        const user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
        if (!user) throw new Error('User not found');

        const sqlUpdates = [];
        const sqlValues = [];

        for (let [key, value] of Object.entries(updates)) {
            // Translate camelCase key to snake_case column
            let dbKey = COLUMN_MAP[key] || key;

            // Handle nested objects like stats (e.g. 'stats.wins')
            if (key.includes('.')) {
                let [parentKey, childKey] = key.split('.');
                const dbParentKey = COLUMN_MAP[parentKey] || parentKey;
                const currentParent = JSON.parse(user[dbParentKey] || '{}');

                if (value && typeof value === 'object' && value._type === 'increment') {
                    currentParent[childKey] = (currentParent[childKey] || 0) + value.value;
                } else {
                    currentParent[childKey] = value;
                }

                sqlUpdates.push(`${dbParentKey} = ?`);
                sqlValues.push(JSON.stringify(currentParent));
                continue;
            }

            // Handle increment stubs
            if (value && typeof value === 'object' && value._type === 'increment') {
                sqlUpdates.push(`${dbKey} = ${dbKey} + ?`);
                sqlValues.push(value.value);
                continue;
            }

            // Handle arrayUnion / arrayRemove stubs
            if (value && typeof value === 'object' && (value._type === 'arrayUnion' || value._type === 'arrayRemove')) {
                const currentArray = JSON.parse(user[dbKey] || '[]');
                if (value._type === 'arrayUnion') {
                    if (!currentArray.includes(value.value)) {
                        currentArray.push(value.value);
                    }
                } else if (value._type === 'arrayRemove') {
                    const idx = currentArray.indexOf(value.value);
                    if (idx !== -1) {
                        currentArray.splice(idx, 1);
                    }
                }
                sqlUpdates.push(`${dbKey} = ?`);
                sqlValues.push(JSON.stringify(currentArray));
                continue;
            }

            // Convert boolean to 0/1 for SQLite
            if (typeof value === 'boolean') {
                value = value ? 1 : 0;
            }

            // Standard scalar update
            sqlUpdates.push(`${dbKey} = ?`);
            if (Array.isArray(value) || (value && typeof value === 'object')) {
                sqlValues.push(JSON.stringify(value));
            } else {
                sqlValues.push(value);
            }
        }

        if (sqlUpdates.length > 0) {
            sqlValues.push(uid);
            const query = `UPDATE users SET ${sqlUpdates.join(', ')} WHERE uid = ?`;
            sqliteDb.prepare(query).run(...sqlValues);
        }
    });

    transaction();
}

// REST user inventory and puck management routes
app.post('/api/user/saveInventory', authenticateToken, (req, res) => {
    const { updates } = req.body;
    if (!updates) return res.status(400).json({ error: 'No updates provided' });

    try {
        applyUserUpdates(req.user.uid, updates);
        syncUserInventory(req.user.uid);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to save inventory:', err);
        res.status(500).json({ error: err.message || 'Database update failed' });
    }
});

app.post('/api/user/pucks/update', authenticateToken, (req, res) => {
    const { puckId, updates } = req.body;
    if (!puckId || !updates) return res.status(400).json({ error: 'Missing puckId or updates' });

    try {
        const transaction = sqliteDb.transaction(() => {
            const puck = sqliteDb.prepare('SELECT * FROM pucks WHERE id = ? AND user_id = ?').get(puckId, req.user.uid);

            if (!puck) {
                // Create new puck
                sqliteDb.prepare(`
                    INSERT INTO pucks (id, user_id, icon_id, tier, xp, stats, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(puckId, req.user.uid, updates.iconId || 1001, updates.tier || 0, updates.xp || 0, JSON.stringify(updates.stats || {}), new Date().toISOString());
            } else {
                // Update existing puck
                const sqlUpdates = [];
                const sqlValues = [];

                for (const [key, value] of Object.entries(updates)) {
                    sqlUpdates.push(`${key} = ?`);
                    if (key === 'stats') {
                        sqlValues.push(JSON.stringify(value));
                    } else {
                        sqlValues.push(value);
                    }
                }

                if (sqlUpdates.length > 0) {
                    sqlValues.push(puckId);
                    sqlValues.push(req.user.uid);
                    sqliteDb.prepare(`UPDATE pucks SET ${sqlUpdates.join(', ')} WHERE id = ? AND user_id = ?`).run(...sqlValues);
                }
            }
        });
        transaction();

        syncUserPucks(req.user.uid);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to update puck stats:', err);
        res.status(500).json({ error: 'Database update failed' });
    }
});

app.get('/api/user/profile/:uid', (req, res) => {
    const uid = req.params.uid;
    try {
        const user = sqliteDb.prepare('SELECT uid, username, equipped_icon, xp, stats, online_status, last_seen, loadouts, active_loadout FROM users WHERE uid = ?').get(uid);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const loadouts = JSON.parse(user.loadouts || '[]');
        const activeLoadout = user.active_loadout || 0;

        const profile = {
            uid: user.uid,
            username: user.username,
            equippedIcon: user.equipped_icon,
            xp: user.xp,
            stats: JSON.parse(user.stats || '{}'),
            onlineStatus: user.online_status || 'offline',
            lastSeen: user.last_seen,
            equippedSkin: loadouts?.[activeLoadout]?.[0]?.skinId || 1001
        };

        res.json({ success: true, profile });
    } catch (err) {
        console.error('Failed to fetch profile:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/friends', authenticateToken, (req, res) => {
    const { uids } = req.body;
    if (!uids || !Array.isArray(uids) || uids.length === 0) {
        return res.json({ success: true, friends: [] });
    }

    try {
        const placeholders = uids.map(() => '?').join(',');
        const query = `
            SELECT uid, username, email, online_status as onlineStatus 
            FROM users 
            WHERE uid IN (${placeholders})
        `;
        const friends = sqliteDb.prepare(query).all(...uids.slice(0, 10));
        res.json({ success: true, friends });
    } catch (err) {
        console.error('Failed to fetch friend statuses:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/user/search', authenticateToken, (req, res) => {
    const queryStr = req.query.q;
    if (!queryStr) return res.status(400).json({ error: 'Search query required' });

    try {
        const results = sqliteDb.prepare(`
            SELECT uid, username, email 
            FROM users 
            WHERE (username = ? OR email = ?) AND uid != ?
            LIMIT 5
        `).all(queryStr.trim(), queryStr.trim(), req.user.uid);
        res.json({ success: true, results });
    } catch (err) {
        console.error('Failed to search players:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/notifications/send', authenticateToken, (req, res) => {
    const { targetUid, type, data } = req.body;
    if (!targetUid || !type) return res.status(400).json({ error: 'Missing targetUid or type' });

    try {
        const id = 'notif_' + Math.random().toString(36).substring(2, 15);
        const fromName = sqliteDb.prepare('SELECT username FROM users WHERE uid = ?').get(req.user.uid)?.username || 'PuckPlayer';

        sqliteDb.prepare(`
            INSERT INTO notifications (id, target_uid, from_uid, from_name, type, data, timestamp, read)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        `).run(id, targetUid, req.user.uid, fromName, type, JSON.stringify(data || {}), new Date().toISOString());

        syncUserNotifications(targetUid);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to send notification:', err);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

app.post('/api/user/notifications/read', authenticateToken, (req, res) => {
    const { notificationId } = req.body;
    if (!notificationId) return res.status(400).json({ error: 'Missing notificationId' });

    try {
        sqliteDb.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND target_uid = ?').run(notificationId, req.user.uid);
        syncUserNotifications(req.user.uid);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to mark notification read:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/notifications/delete', authenticateToken, (req, res) => {
    const { notificationId } = req.body;
    if (!notificationId) return res.status(400).json({ error: 'Missing notificationId' });

    try {
        sqliteDb.prepare('DELETE FROM notifications WHERE id = ? AND target_uid = ?').run(notificationId, req.user.uid);
        syncUserNotifications(req.user.uid);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to delete notification:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/notifications/clear', authenticateToken, (req, res) => {
    try {
        sqliteDb.prepare('DELETE FROM notifications WHERE target_uid = ?').run(req.user.uid);
        syncUserNotifications(req.user.uid);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to clear notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/user/resetInventory', authenticateToken, (req, res) => {
    try {
        sqliteDb.prepare(`
            UPDATE users SET 
              equipped_icon = 1001,
              equipped_puck_id = NULL,
              following = '[]',
              skins = '[]',
              zoins = 0,
              free_packs = 1,
              ban_until = NULL,
              consecutive_quits = 0,
              xp = 0,
              time_played = 0,
              loadouts = '[["speed_boost","rocket","shield"],["teleport","bomb_throw","ghost"],["giant","freeze_ray","grapple"]]',
              active_loadout = 0,
              is_pro = 0,
              pro_expiry = NULL,
              last_pro_reward = 0,
              last_login = ?,
              stats = '{"gamesPlayed":0,"wins":0,"knockouts":0,"damageDealt":0,"stomps":0,"highestCombo":0}',
              achievements = '[]',
              claimed_season_rewards = '[]',
              daily_quests = '[]',
              last_quest_reset = NULL
            WHERE uid = ?
        `).run(new Date().toISOString(), req.user.uid);

        // Delete pucks
        sqliteDb.prepare('DELETE FROM pucks WHERE user_id = ?').run(req.user.uid);

        syncUserInventory(req.user.uid);
        syncUserPucks(req.user.uid);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to reset inventory:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// --- MAINTENANCE ENDPOINT (For GitHub Actions) ---
let activeMaintenance = null;
const ICONS_DATA = require('../src/utils/icons.json'); // [SHOP] Load icon pool
let currentShop = { items: [], lastRotation: 0 };
const tradeSessions = new Map(); // [TRADE] Active trade sessions: { tradeId: { p1: { uid, items, zoins, ready }, p2: { ... } } }
const pendingInvites = new Map(); // [TRADE] Pending invites: { inviteId: { from, to, timestamp } } // [SHOP] Store current rotation

// --- [CRAFTING] RECIPES ---
const CRAFTING_RECIPES = {
    'forge_rare': {
        input: { count: 5, tier: 0 },
        output: { tier: 2 },
        cost: 100,
        label: 'Rare Forge'
    },
    'forge_epic': {
        input: { count: 3, tier: 2 },
        output: { tier: 3 },
        cost: 250,
        label: 'Epic Forge'
    },
    'forge_legendary': {
        input: { count: 2, tier: 3 },
        output: { tier: 4 },
        cost: 500,
        label: 'Legendary Forge'
    },
    'disenchant': {
        input: { count: 1, tier: 'any' },
        output: { zoins: 50 },
        label: 'Recycle'
    }
};

app.post('/api/admin/maintenance', (req, res) => {
    const { secret, duration } = req.body;

    // Simple hardcoded secret for now (Professional: use process.env.DEPLOY_SECRET)
    if (secret !== process.env.DEPLOY_SECRET && secret !== 'puckoff_deploy_secret_2026') {
        console.warn('⚠️ Maintenance Warning REJECTED: Invalid Secret'); // Log unauthorized attempts
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const durationMin = duration || 10;
    console.log(`📢 Broadcasting Maintenance Warning: ${durationMin} minutes`);

    const message = {
        type: 'maintenance',
        duration: durationMin,
        message: `⚠️ Server Restarting in ${durationMin} minutes for Updates!`,
        startTime: Date.now()
    };

    activeMaintenance = message;

    // Broadcast to all connected clients
    io.emit('server_message', message);

    // Auto-clear after duration (plus buffer)
    setTimeout(() => {
        activeMaintenance = null;
    }, durationMin * 60 * 1000 + 5000);

    res.json({ success: true, message: 'Broadcast sent' });
});

// ============ FIREBASE ADMIN SETUP ============
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
        const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error.message);
    }
} else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_BASE64 not found. Persistent data will not work.');
}

let db, auth;

// MOCK DB for local dev without credentials
class MockFirestore {
    collection() { return this; }
    doc() { return this; }
    get() { return Promise.resolve({ exists: false, data: () => ({}) }); }
    set() { return Promise.resolve(); }
    add() { return Promise.resolve(); }
    update() { return Promise.resolve(); }
    runTransaction(cb) { return cb({ get: this.get, update: this.update }); }
}

class MockAuth {
    getUserByEmail() { return Promise.reject(new Error('Mock Auth: User not found')); }
    createUser() { return Promise.resolve({ uid: 'mock_uid_' + Date.now() }); }
}

if (admin.apps.length > 0) {
    db = getFirestore();
    auth = getAuth();
} else {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        console.error('❌ FATAL: FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in production!');
        process.exit(1);
    }
    console.warn('⚠️ using MOCK DATABASE (In-Memory) - Payments/Auth will not persist!');
    db = new MockFirestore();
    auth = new MockAuth();
}

// ============ SHOP ROTATION LOGIC ============
function rotateShop() {
    const allIcons = Object.values(ICONS_DATA);
    if (!allIcons.length) return;

    // Prices by tier
    const pricing = { 2: 500, 3: 1500, 4: 5000 };

    // Select 3 unique random icons (1 Rare, 1 Epic, 1 Legendary)
    const rare = allIcons.filter(icon => icon.tier === 2);
    const epic = allIcons.filter(icon => icon.tier === 3);
    const legendary = allIcons.filter(icon => icon.tier === 4);

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    currentShop = {
        items: [
            { ...pick(rare), cost: pricing[2] },
            { ...pick(epic), cost: pricing[3] },
            { ...pick(legendary), cost: pricing[4] }
        ].filter(i => i.id), // Ensure valid picks
        lastRotation: Date.now()
    };

    console.log(`🎰 Shop Rotated: ${currentShop.items.map(i => i.name).join(', ')}`);
}

// Rotate will be scheduled after io is initialized (see server.listen)

// Ensure Stripe is configured in production
if (process.env.NODE_ENV === 'production' && (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_YOUR_KEY')) {
    console.error('❌ FATAL: STRIPE_SECRET_KEY is missing or default in production!');
    process.exit(1);
}

// --- DAILY QUESTS POOL ---
const QUEST_POOL = [
    { id: 'stomp_5', label: 'Bout to Stomp', goal: 5, reward: 50, description: 'Get 5 Kills in matches' },
    { id: 'survive_2', label: 'Top Tier Survivor', goal: 1, reward: 75, description: 'Reach the final 2 players' },
    { id: 'power_10', label: 'Power Hungry', goal: 10, reward: 40, description: 'Collect 10 Powerups' },
    { id: 'win_1', label: 'Victory Lap', goal: 1, reward: 100, description: 'Win a single match' },
    { id: 'dash_20', label: 'Speed Demon', goal: 20, reward: 30, description: 'Use Dash 20 times' },
    { id: 'play_3', label: 'Frequent Flyer', goal: 3, reward: 60, description: 'Complete 3 matches' },
];

// ============ STRIPE WEBHOOK HANDLER ============
async function handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('⚠️ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
        const session = event.data.object;
        console.log('💰 Payment succeeded:', session.id);

        // Get customer email
        const email = session.customer_email || session.customer_details?.email || session.metadata?.email;
        const amount = session.amount_total || session.amount || 0;

        let packType = 'single';
        if (amount >= 9900) packType = 'unlockAll';
        else if (amount >= 250) packType = 'bundle10';

        console.log(`📦 Detected pack type: ${packType} from amount: $${(amount / 100).toFixed(2)}`);

        if (email) {
            await fulfillPurchase(email, packType);
        } else {
            console.log('⚠️ No email found in session, cannot fulfill');
        }
    }

    res.status(200).json({ received: true });
}

// ============ FULFILLMENT LOGIC ============
async function fulfillPurchase(email, packType) {
    console.log(`📦 Fulfilling ${packType} for ${email}`);

    try {
        let user = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
        let uid;
        if (!user) {
            console.log(`✨ Creating new user for ${email}`);
            uid = generateUUID();
            const createdAt = new Date().toISOString();
            const defaultIcons = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];
            const placeholderPasswordHash = await bcrypt.hash('autocreated_' + Math.random().toString(), 10);

            sqliteDb.prepare(`
                INSERT INTO users (uid, email, password_hash, username, created_at, last_login, icons, zoins)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(uid, email, placeholderPasswordHash, email.split('@')[0], createdAt, createdAt, JSON.stringify(defaultIcons), 0);

            user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
        } else {
            uid = user.uid;
        }

        const iconsArray = JSON.parse(user.icons || '[]');
        let zoins = user.zoins || 0;
        let isPro = user.is_pro || 0;
        let proExpiry = user.pro_expiry || null;
        let lastProReward = user.last_pro_reward || 0;

        let zoinsToAdd = 0;
        if (packType === 'pouch') zoinsToAdd = 900;
        else if (packType === 'cache') zoinsToAdd = 3800;
        else if (packType === 'vault') zoinsToAdd = 16000;
        else if (packType === 'bundle10') zoinsToAdd = 2500;
        else if (packType === 'single') zoinsToAdd = 500;
        else if (packType === 'puckoff_pro') {
            isPro = 1;
            proExpiry = (Date.now() + (30 * 24 * 60 * 60 * 1000)).toString();
            lastProReward = 0;
            console.log(`⚡ Activated PuckOff Pro for ${email}`);
        }

        if (packType === 'unlockAll') {
            const unlockedIcons = Array.from({ length: 150 }, (_, i) => i + 1);
            zoins = zoins + 50000;
            sqliteDb.prepare('UPDATE users SET icons = ?, zoins = ? WHERE uid = ?')
                .run(JSON.stringify(unlockedIcons), zoins, uid);
            console.log(`🐋 Whale unlock complete for ${email}`);
        } else {
            zoins = zoins + zoinsToAdd;
            if (packType === 'puckoff_pro') {
                sqliteDb.prepare('UPDATE users SET is_pro = 1, pro_expiry = ?, last_pro_reward = ?, zoins = ? WHERE uid = ?')
                    .run(proExpiry, lastProReward, zoins, uid);
            } else {
                sqliteDb.prepare('UPDATE users SET zoins = ? WHERE uid = ?')
                    .run(zoins, uid);
            }
            console.log(`🎁 Granted ${zoinsToAdd} Zoins to ${email}`);
        }

        const paymentId = 'pay_' + Math.random().toString(36).substring(2, 15);
        sqliteDb.prepare(`
            INSERT INTO payments (id, user_id, email, pack_type, amount, timestamp, status, method)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            paymentId,
            uid,
            email,
            packType,
            packType === 'unlockAll' ? 9999 : (packType === 'bundle10' ? 300 : 50),
            new Date().toISOString(),
            'completed',
            'admin_bypass'
        );
        console.log('💰 Payment recorded in history');

        syncUserInventory(uid);
        console.log('✅ Database updated successfully');

    } catch (error) {
        console.error('❌ Error fulfilling purchase:', error);
    }
}

// ============ ADMIN API ENDPOINTS ============
// Middleware to verify admin password (basic protection)
const verifyAdmin = (req, res, next) => {
    // In a real app, verify ID token. For this demo, we'll assume the request comes from a trusted admin client
    // or checks a shared secret header if you implemented one. 
    next();
};

// [NEW] Admin Purchase Simulation
app.post('/api/admin/simulate-purchase', verifyAdmin, async (req, res) => {
    const { email, packId } = req.body;
    console.log(`👑 Admin simulating purchase for ${email}: ${packId}`);

    try {
        await fulfillPurchase(email, packId);
        res.json({ success: true });
    } catch (err) {
        console.error("Admin purchase failed:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/rooms', (req, res) => {
    // ... code remains same ...
    const roomsList = [];
    for (const [code, room] of rooms) {
        roomsList.push({
            code,
            playerCount: room.players?.size || 0,
            status: room.gameStarted ? 'playing' : 'lobby'
        });
    }

    let playersOnline = 0;
    for (const room of rooms.values()) {
        playersOnline += room.players?.size || 0;
    }

    res.json({ rooms: roomsList, playersOnline, totalRooms: rooms.size });
});
// ============ SUCCESS/CANCEL PAGES ============
app.get('/payment/success', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful!</title>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    background: linear-gradient(135deg, #0a0a1a, #1a0a2e);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .card {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 3rem;
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    box-shadow: 0 0 50px rgba(0, 212, 255, 0.2);
                }
                h1 { color: #00ff87; margin-bottom: 1rem; }
                p { color: #8892b0; margin-bottom: 2rem; }
                .btn {
                    background: #00d4ff;
                    color: #000;
                    padding: 1rem 2rem;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: bold;
                    transition: transform 0.2s;
                    display: inline-block;
                }
                .btn:hover { transform: scale(1.05); }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Purchase Successful! 🎉</h1>
                <p>Your packs have been added to your inventory.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="btn">Return to Arena</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/payment/cancel', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Cancelled</title>
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    background: linear-gradient(135deg, #0a0a1a, #1a0a2e);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    text-align: center;
                }
                .card {
                    background: rgba(255, 255, 255, 0.05);
                    padding: 3rem;
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                h1 { color: #ff4757; margin-bottom: 1rem; }
                .btn {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    padding: 1rem 2rem;
                    text-decoration: none;
                    border-radius: 50px;
                    margin-top: 1rem;
                    display: inline-block;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Payment Cancelled</h1>
                <p>No charge was made.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="btn">Return to Store</a>
            </div>
        </body>
        </html>
    `);
});

// ============ API: Get Player Inventory ============
app.get('/api/inventory/:email', (req, res) => {
    const email = req.params.email;
    const inventory = playerInventories.get(email) || { icons: [], freePacks: 0 };
    res.json(inventory);
});

// ============ API: Claim Free Packs ============
app.post('/api/claim-packs', (req, res) => {
    const { email, count } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const inventory = playerInventories.get(email);
    if (!inventory || inventory.freePacks < count) {
        return res.status(400).json({ error: 'Not enough packs' });
    }

    inventory.freePacks -= count;
    res.json({ success: true, remainingPacks: inventory.freePacks });
});

// ============ ADMIN API ENDPOINTS ============
app.get('/api/admin/rooms', async (req, res) => {
    const roomsList = [];
    for (const [code, room] of rooms) {
        roomsList.push({
            code,
            playerCount: room.players?.size || 0,
            status: room.gameStarted ? 'playing' : 'lobby'
        });
    }

    // Count total players online - DEPRECATED (Using io.engine.clientsCount)
    // let playersOnline = 0;
    // for (const room of rooms.values()) {
    //     playersOnline += room.players?.size || 0;
    // }

    // Fetch global stats
    let totalTimePlayedSeconds = 0;
    try {
        const statsRow = sqliteDb.prepare("SELECT value FROM global_stats WHERE key = 'totalTimePlayedSeconds'").get();
        if (statsRow) {
            totalTimePlayedSeconds = parseInt(statsRow.value, 10) || 0;
        }
    } catch (e) {
        console.log('Error fetching global stats:', e.message);
    }

    res.json({
        rooms: roomsList,
        playersOnline: io.engine.clientsCount, // Use accurate socket count
        totalRooms: rooms.size,
        totalTimePlayedSeconds
    });
});

app.get('/api/admin/users', (req, res) => {
    try {
        const users = sqliteDb.prepare('SELECT uid, email, username, icons, free_packs FROM users').all();
        const formattedUsers = users.map(u => ({
            id: u.uid,
            email: u.email,
            username: u.username,
            icons: JSON.parse(u.icons || '[]'),
            freePacks: u.free_packs
        }));
        res.json({ success: true, users: formattedUsers });
    } catch (err) {
        console.error('Failed to list admin users:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/revenue', (req, res) => {
    try {
        const payments = sqliteDb.prepare('SELECT * FROM payments WHERE status = "completed" ORDER BY timestamp DESC').all();
        const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        res.json({
            success: true,
            totalRevenue: (totalAmount / 100).toFixed(2),
            transactions: payments.map(p => ({
                id: p.id,
                date: p.timestamp,
                email: p.email,
                packType: p.pack_type,
                amount: p.amount
            }))
        });
    } catch (err) {
        console.error('Failed to get revenue metrics:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Game state
const rooms = new Map();
const playerRooms = new Map();
const playerInventories = new Map();
const matchmakingQueue = new Map(); // [NEW] { socketId: { playerName, userEmail, skinData, joinedAt } }
const disconnectedPlayers = new Map(); // [NEW] { playerId: { roomCode, playerData, timeout } }
const socketToUid = new Map(); // [NEW] socket.id -> { uid, email }
const uidToSockets = new Map(); // [NEW] uid -> Set(socket.ids)

// --- GLOBAL CHAT ---
const globalChatHistory = [];
const BANNED_WORDS = ['fuck', 'shit', 'bitch', 'ass', 'asshole', 'cunt', 'dick', 'cock', 'pussy', 'slut', 'whore', 'retard', 'fag', 'faggot', 'nigger', 'nigga', 'nigg'];
function filterProfanity(text) {
    if (!text) return '';
    let filtered = text;
    BANNED_WORDS.forEach(word => {
        // Simple case-insensitive match for demo purposes
        const regex = new RegExp(`\\b${word}s?\\b`, 'gi');
        filtered = filtered.replace(regex, '***');
    });
    return filtered;
}

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Player colors
const PLAYER_COLORS = ['#00d4ff', '#ff006e', '#00ff87', '#9d4edd'];

// Physics Constants (Matches src/utils/physics.js for consistency)
const PHYSICS = {
    gravity: -50,
    accel: 60,
    damping: 0.1,
    jumpForce: 22,
    dashForce: 65,
    maxVelocity: 45,
    tickRate: 22, // 22Hz (approx 45ms per tick)
};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id} `);

    if (activeMaintenance) {
        // Recalculate remaining duration to be accurate
        const elapsedMinutes = (Date.now() - activeMaintenance.startTime) / 1000 / 60;
        const remainingDuration = Math.max(0, activeMaintenance.duration - elapsedMinutes);

        if (remainingDuration > 0) {
            socket.emit('server_message', {
                ...activeMaintenance,
                duration: remainingDuration, // Update duration for client timer
                message: `⚠️ Server Restarting in ${Math.ceil(remainingDuration)} minutes!`
            });
        }
    }

    // ========== MATCHMAKING EVENTS ==========
    socket.on('startMatchmaking', ({ playerName, userEmail, skinData, wagerAmount = 0 }) => {
        console.log(`🔍 Player joined matchmaking: ${playerName} (${socket.id}) [WAGER: ${wagerAmount}]`);
        matchmakingQueue.set(socket.id, {
            socket,
            playerName,
            userEmail,
            skinData,
            wagerAmount, // [NEW] Track wager
            joinedAt: Date.now()
        });
        socket.emit('matchmakingUpdate', { status: 'searching' });
        socket.emit('shop_update', currentShop); // [SHOP] Send initial shop state
    });

    socket.on('cancelMatchmaking', () => {
        if (matchmakingQueue.has(socket.id)) {
            console.log(`❌ Player left matchmaking: ${socket.id}`);
            matchmakingQueue.delete(socket.id);
            socket.emit('matchmakingUpdate', { status: 'idle' });
        }
    });

    // Create a new room
    socket.on('createRoom', ({ playerName, userEmail, skinData }, callback) => {
        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
            players: new Map(),
            spectators: new Set(), // Track active spectators
            powerups: [],
            gameState: 'waiting',
            hostId: socket.id,
        });

        joinRoom(socket, roomCode, playerName, userEmail, callback, skinData);
    });

    // Join existing room
    // ============ SESSION RECOVERY ============
    socket.on('reconnectPlayer', ({ playerId, roomCode }, callback) => {
        console.log(`🔄 Reconnect attempt for ${playerId} in room ${roomCode}`);
        const session = disconnectedPlayers.get(playerId);

        if (session && session.roomCode === roomCode) {
            // Cancel the cleanup timeout
            clearTimeout(session.timeout);
            disconnectedPlayers.delete(playerId);

            const room = rooms.get(roomCode);
            if (room) {
                // Restore player data to the room
                const playerData = session.playerData;
                room.players.set(socket.id, playerData);
                playerRooms.set(socket.id, roomCode);

                // Update room state
                io.to(roomCode).emit('playerJoined', { playerId: socket.id, playerName: playerData.name });
                io.to(roomCode).emit('playerUpdate', getPlayersArray(room));

                if (callback) callback({ success: true, gameState: room.gameState, selectedMap: room.selectedMap });
                console.log(`✅ Reconnected ${playerData.name} (${socket.id}) to ${roomCode}`);
                return;
            }
        }

        if (callback) callback({ success: false, message: 'Session expired or invalid' });
    });

    // --- DAILY QUESTS ---
    socket.on('getQuests', async ({ email }, callback) => {
        try {
            if (!email) return callback({ success: false, error: 'Email required' });

            const user = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
            if (!user) return callback({ success: false, error: 'User not found' });

            const today = new Date().toISOString().split('T')[0];

            let quests = [];
            try {
                quests = JSON.parse(user.daily_quests || '[]');
            } catch (e) {
                quests = [];
            }

            if (user.last_quest_reset !== today) {
                // Pick 3 random quests
                const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
                quests = shuffled.slice(0, 3).map(q => ({ ...q, progress: 0, completed: false }));

                sqliteDb.prepare('UPDATE users SET daily_quests = ?, last_quest_reset = ? WHERE uid = ?')
                    .run(JSON.stringify(quests), today, user.uid);
                console.log(`♻️ Reset quests for ${email}`);
            }

            callback({ success: true, quests });
        } catch (error) {
            console.error('❌ Error fetching quests:', error);
            callback({ success: false, error: error.message });
        }
    });

    socket.on('trackGameplayStat', async ({ email, statType }, callback) => {
        try {
            if (!email) return;
            const user = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
            if (!user) return;

            const transaction = sqliteDb.transaction(() => {
                const currentUser = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(user.uid);
                if (!currentUser) return;

                let quests = [];
                try {
                    quests = JSON.parse(currentUser.daily_quests || '[]');
                } catch (e) {
                    quests = [];
                }

                let changed = false;
                let zoinsGained = 0;

                quests = quests.map(q => {
                    if (q.completed) return q;

                    let progressed = false;
                    if (statType === 'dash' && q.id === 'dash_20') progressed = true;
                    if (statType === 'powerup' && q.id === 'power_10') progressed = true;

                    if (progressed) {
                        q.progress += 1;
                        changed = true;
                        if (q.progress >= q.goal) {
                            q.completed = true;
                            zoinsGained += q.reward;
                        }
                    }
                    return q;
                });

                if (changed) {
                    sqliteDb.prepare('UPDATE users SET daily_quests = ?, zoins = zoins + ? WHERE uid = ?')
                        .run(JSON.stringify(quests), zoinsGained, currentUser.uid);
                    socket.emit('questsUpdated', { quests, zoinsGained });
                }
            });
            transaction();
        } catch (err) {
            console.error('Quest tracking error:', err);
        }
    });

    // --- LEADERBOARD ---
    socket.on('getLeaderboard', async ({ category }, callback) => {
        try {
            const validCategories = ['rankPoints', 'wins', 'kills'];
            const sortField = validCategories.includes(category) ? category : 'rankPoints';

            console.log(`📊 Fetching leaderboard for: ${sortField}`);

            let leaderboardRows = [];
            if (sortField === 'rankPoints') {
                leaderboardRows = sqliteDb.prepare(`
                    SELECT uid, username, rank_points, xp 
                    FROM users 
                    ORDER BY rank_points DESC 
                    LIMIT 50
                `).all();
            } else if (sortField === 'wins' || sortField === 'kills') {
                leaderboardRows = sqliteDb.prepare(`
                    SELECT uid, username, rank_points, xp, CAST(json_extract(stats, '$.${sortField}') AS INTEGER) AS category_val
                    FROM users 
                    ORDER BY category_val DESC 
                    LIMIT 50
                `).all();
            }

            const leaderboard = leaderboardRows.map(row => {
                return {
                    id: row.uid,
                    name: row.username || 'Unknown Player',
                    [sortField]: sortField === 'rankPoints' ? row.rank_points : row.category_val,
                    rankPoints: row.rank_points || 0,
                    xp: row.xp || 0
                };
            });

            if (callback) callback({ success: true, leaderboard });
        } catch (error) {
            console.error('❌ Error fetching leaderboard:', error);
            if (callback) callback({ success: false, error: 'Failed to fetch leaderboard' });
        }
    });

    socket.on('joinRoom', ({ roomCode, playerName, userEmail, skinData }, callback) => {
        const code = roomCode.toUpperCase();
        if (!rooms.has(code)) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const room = rooms.get(code);
        if (room.players.size >= 4) {
            // Offer to join as spectator instead of rejecting
            callback({
                success: false,
                error: 'Room is full',
                canSpectate: true
            });
            return;
        }

        joinRoom(socket, code, playerName, userEmail, callback, skinData);
    });

    // Join as spectator explicitly
    socket.on('joinAsSpectator', ({ roomCode, playerName, userEmail }, callback) => {
        const code = roomCode.toUpperCase();
        if (!rooms.has(code)) {
            callback({ success: false, error: 'Room not found' });
            return;
        }
        joinRoom(socket, code, playerName, userEmail, callback, {}, true);
    });

    // Quick join - find or create room
    socket.on('quickJoin', ({ playerName, userEmail, skinData }, callback) => {
        let roomCode = null;

        // Find room with space
        for (const [code, room] of rooms) {
            if (room.players.size < 4 && room.gameState === 'waiting') {
                roomCode = code;
                break;
            }
        }

        // Create new room if none found
        if (!roomCode) {
            roomCode = generateRoomCode();
            rooms.set(roomCode, {
                players: new Map(),
                spectators: new Set(),
                powerups: [],
                gameState: 'waiting',
                hostId: socket.id,
                selectedMap: 'SAWBLADE CITY', // Default map
                tick: 0,
                history: new Map(), // tick -> { playerStates: { id: { p, v } } }
            });
        }

        joinRoom(socket, roomCode, playerName, userEmail, callback, skinData);
    });

    // ============ ANALYTICS TRACKING ============
    // Track connection time
    socket.data.connectTime = Date.now();

    // Broadcast player count to all clients periodically
    // We do this throttled to avoid spam
    if (!global.playerCountInterval) {
        global.playerCountInterval = setInterval(() => {
            const count = io.engine.clientsCount;
            io.emit('serverStats', { playersOnline: count });
        }, 5000);
    }

    // Handle player ready
    socket.on('playerReady', ({ isReady, loadout }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (player) {
            player.ready = isReady;
            player.loadout = loadout; // Store loadout

            // Check if all ready
            const allReady = Array.from(room.players.values()).every(p => p.ready);
            const playersList = Array.from(room.players.values());

            io.to(roomCode).emit('roomUpdate', { players: playersList });

            if (allReady && room.players.size >= 1) { // Allow 1 player start for testing
                startGame(roomCode);
            }
        }
    });


    // Handle Map Vote
    socket.on('voteMap', ({ mapName }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (room) {
            room.selectedMap = mapName; // Simple last vote wins for now, or implement tally
            io.to(roomCode).emit('mapVoted', { mapName });
        }
    });

    // Player input update (intent-based movement)
    socket.on('playerInput', (input) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room || room.gameState !== 'playing') return;

        const player = room.players.get(socket.id);
        if (player) {
            player.input = input; // { moveX, moveZ, jump, dash }
            player.lastActivity = Date.now(); // Reset AFK timer
        }
    });

    // Handle legacy player position (for fallback/transition, mostly ignored now)
    socket.on('playerPosition', ({ position, velocity, rotation }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;
        const room = rooms.get(roomCode);
        if (room && room.gameState === 'playing' && !room.serverAuthoritative) {
            const player = room.players.get(socket.id);
            if (player) {
                player.position = position;
                player.velocity = velocity;
                socket.to(roomCode).emit('playerMoved', { playerId: socket.id, position, velocity });
            }
        }
    });

    // Player damage update (hazards / self-reported)
    socket.on('playerDamage', ({ damage }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;
        const room = rooms.get(roomCode);
        if (!room) return;
        const player = room.players.get(socket.id);
        if (player) {
            player.damage = damage;
            io.to(roomCode).emit('damageUpdate', { playerId: socket.id, damage });
        }
    });

    // Player knockout
    socket.on('playerKnockout', ({ knockedOutId, tick }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Validation: Ensure victim was actually near a hazard or the attacker
        const history = room.history.get(tick || room.tick);
        if (history) {
            const victimState = history[knockedOutId];
            if (victimState) {
                // Check if near boundaries (Arena size usually 15-20 units)
                const distFromCenter = Math.sqrt(victimState.p[0] ** 2 + victimState.p[2] ** 2);
                if (distFromCenter < 8 && !tick) {
                    console.warn(`🛡️ Suspicious Knockout: ${knockedOutId} reported far from edge.`);
                    // We allow it but log it
                }
            }
        }

        // Increment scorer's score and kills
        const scorer = room.players.get(socket.id);
        if (scorer) {
            scorer.score = (scorer.score || 0) + 1;
            scorer.kills = (scorer.kills || 0) + 1;
        }

        const victim = room.players.get(knockedOutId);
        if (victim) {
            victim.deathTime = Date.now();
        }

        io.to(roomCode).emit('knockout', {
            scorerId: socket.id,
            knockedOutId,
            scores: getScoresObject(room),
        });

        // Check win condition (first to 5)
        if (scorer && scorer.score >= 5) {
            const honors = calculateHonors(room);
            io.to(roomCode).emit('gameOver', {
                winnerId: socket.id,
                scores: getScoresObject(room),
                honors
            });
            room.gameState = 'ended';

            awardGameRewards(room, socket.id);
        }
    });

    // Server-Side Hit Validation (Lag Compensation)
    socket.on('reportStomp', ({ targetId, damage, tick }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;
        const room = rooms.get(roomCode);
        if (!room || room.gameState !== 'playing') return;

        const history = room.history.get(tick);
        if (!history) {
            console.warn(`⚠️ Validation failed: Tick ${tick} too old or missing`);
            return;
        }

        const attackerState = history[socket.id];
        const victimState = history[targetId];

        if (attackerState && victimState) {
            const dist = Math.sqrt(
                (attackerState.p[0] - victimState.p[0]) ** 2 +
                (attackerState.p[1] - victimState.p[1]) ** 2 +
                (attackerState.p[2] - victimState.p[2]) ** 2
            );

            if (dist < 3.0) { // Slightly more generous threshold for high stakes
                const victim = room.players.get(targetId);
                const attacker = room.players.get(socket.id);
                if (victim && attacker) {
                    const dmg = damage || 5;
                    victim.damage = (victim.damage || 0) + dmg;
                    attacker.stomps = (attacker.stomps || 0) + 1;
                    attacker.damageDealt = (attacker.damageDealt || 0) + dmg;
                    io.to(roomCode).emit('stomp', { attackerId: socket.id, targetId, damage: dmg });
                    io.to(roomCode).emit('damageUpdate', { playerId: targetId, damage: victim.damage });
                }
            } else {
                console.warn(`🛡️ Rejected Stomp: Dist ${dist.toFixed(2)} > 3.0 at tick ${tick}`);
            }
        }
    });

    // Power-up collected (Server-Authoritative)
    socket.on('powerupCollected', ({ powerupId }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Validate powerup still exists (prevent race condition)
        const powerupIndex = room.powerups.findIndex(p => p.id === powerupId);
        if (powerupIndex === -1) {
            // Powerup already collected by another player
            socket.emit('powerupRejected', { powerupId });
            console.log(`⚠️ Powerup ${powerupId} already collected`);
            return;
        }

        // Remove powerup and broadcast to all clients
        room.powerups.splice(powerupIndex, 1);
        io.to(roomCode).emit('powerupRemoved', { powerupId, collectorId: socket.id });
        console.log(`✅ Player ${socket.id} collected powerup ${powerupId}`);
    });

    // Disconnect
    socket.on('registerPresence', async ({ uid, email }) => {
        if (!uid || !email) return;
        console.log(`📡 Presence registered: ${email} (${uid})`);
        socketToUid.set(socket.id, { uid, email });

        if (!uidToSockets.has(uid)) {
            uidToSockets.set(uid, new Set());
        }
        uidToSockets.get(uid).add(socket.id);

        try {
            sqliteDb.prepare('UPDATE users SET online_status = ?, last_seen = ? WHERE uid = ?')
                .run('online', new Date().toISOString(), uid);
        } catch (err) {
            console.error("Presence update error:", err);
        }
    });

    socket.on('invitePlayer', ({ targetUid, roomCode, inviterName }) => {
        const targetSockets = uidToSockets.get(targetUid);
        if (targetSockets) {
            targetSockets.forEach(sId => {
                io.to(sId).emit('matchInvite', { inviterName, roomCode });
            });
            console.log(`📧 Invitation sent from ${inviterName} to ${targetUid}`);
        }
    });

    // Global Chat
    socket.on('sendChatMessage', ({ username, message, skinTier, uid }) => {
        if (!message || message.trim().length === 0) return;
        const cleanMessage = filterProfanity(message.substring(0, 150)); // Max 150 chars

        const chatMsg = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            uid: uid || null, // [NEW] Added UID for profile lookup
            username: username || 'Player',
            skinTier: skinTier || 0,
            message: cleanMessage,
            timestamp: Date.now()
        };

        globalChatHistory.push(chatMsg);
        if (globalChatHistory.length > 50) globalChatHistory.shift();

        io.emit('chatMessage', chatMsg);
    });

    socket.on('getChatHistory', (callback) => {
        if (typeof callback === 'function') {
            callback({ history: globalChatHistory });
        }
    });

    socket.on('purchaseShopItem', async ({ itemId }, callback) => {
        const userId = socket.userId;
        if (!userId) return callback?.({ success: false, error: 'Not authenticated' });

        const item = currentShop.items.find(i => i.id === itemId);
        if (!item) return callback?.({ success: false, error: 'Item not in current shop' });

        try {
            sqliteDb.transaction(() => {
                const user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(userId);
                if (!user) throw new Error('User not found');

                const ownedIcons = JSON.parse(user.icons || '[]');
                const zoins = user.zoins || 0;

                if (zoins < item.cost) throw new Error('Insufficient Zoins');
                if (ownedIcons.some(icon => (icon.id || icon) === itemId)) throw new Error('Already owned');

                const newIcons = [...ownedIcons, {
                    id: item.id,
                    xp: 0,
                    level: 1,
                    unlockedAt: Date.now()
                }];

                sqliteDb.prepare('UPDATE users SET zoins = zoins - ?, icons = ? WHERE uid = ?')
                    .run(item.cost, JSON.stringify(newIcons), userId);
            })();

            console.log(`💎 Shop Purchase: ${userId} bought ${item.name}`);
            syncUserInventory(userId);
            callback?.({ success: true });
        } catch (err) {
            console.error('[SHOP] Purchase error:', err);
            callback?.({ success: false, error: err.message });
        }
    });

    // --- [TRADE] SYSTEM ---
    socket.on('trade_invite', ({ targetUid }, callback) => {
        const fromUid = socket.userId;
        if (!fromUid || !targetUid || fromUid === targetUid) return callback?.({ success: false, error: 'Invalid trade' });

        const inviteId = `trade_${fromUid}_${targetUid}_${Date.now()}`;
        pendingInvites.set(inviteId, { from: fromUid, to: targetUid, timestamp: Date.now() });

        // Notify target
        const targetSocket = [...io.sockets.sockets.values()].find(s => s.userId === targetUid);
        if (targetSocket) {
            targetSocket.emit('trade_invitation', { inviteId, fromUid, fromUsername: socket.username });
            callback?.({ success: true, inviteId });
        } else {
            callback?.({ success: false, error: 'User is offline' });
        }

        // Auto-expire invite after 30s
        setTimeout(() => pendingInvites.delete(inviteId), 30000);
    });

    socket.on('trade_respond', ({ inviteId, accept }, callback) => {
        const invite = pendingInvites.get(inviteId);
        if (!invite) return callback?.({ success: false, error: 'Invite expired' });

        pendingInvites.delete(inviteId);

        if (accept) {
            const tradeId = `session_${invite.from}_${invite.to}`;
            const session = {
                id: tradeId,
                p1: { uid: invite.from, items: [], zoins: 0, ready: false },
                p2: { uid: invite.to, items: [], zoins: 0, ready: false },
                status: 'active'
            };
            tradeSessions.set(tradeId, session);

            // Notify both
            [invite.from, invite.to].forEach(uid => {
                const s = [...io.sockets.sockets.values()].find(s => s.userId === uid);
                if (s) {
                    s.join(tradeId);
                    s.emit('trade_started', { tradeId, session });
                }
            });
            callback?.({ success: true, tradeId });
        } else {
            const fromSocket = [...io.sockets.sockets.values()].find(s => s.userId === invite.from);
            if (fromSocket) fromSocket.emit('trade_declined', { by: socket.userId });
            callback?.({ success: true });
        }
    });

    socket.on('trade_update_offer', ({ tradeId, items, zoins }) => {
        const session = tradeSessions.get(tradeId);
        if (!session) return;

        const playerKey = session.p1.uid === socket.userId ? 'p1' : 'p2';
        session[playerKey].items = items || [];
        session[playerKey].zoins = zoins || 0;
        session[playerKey].ready = false; // Reset ready on change
        session.p1.ready = false;
        session.p2.ready = false;

        io.to(tradeId).emit('trade_sync', session);
    });

    socket.on('trade_ready', ({ tradeId, ready }) => {
        const session = tradeSessions.get(tradeId);
        if (!session) return;

        const playerKey = session.p1.uid === socket.userId ? 'p1' : 'p2';
        session[playerKey].ready = ready;

        io.to(tradeId).emit('trade_sync', session);

        // If both ready, notify final stage
        if (session.p1.ready && session.p2.ready) {
            io.to(tradeId).emit('trade_final_check');
        }
    });

    socket.on('trade_execute', async ({ tradeId }, callback) => {
        const session = tradeSessions.get(tradeId);
        if (!session || !session.p1.ready || !session.p2.ready) return callback?.({ success: false, error: 'Not ready' });

        try {
            sqliteDb.transaction(() => {
                const p1 = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(session.p1.uid);
                const p2 = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(session.p2.uid);
                if (!p1 || !p2) throw new Error('One of the users was not found');

                const p1Icons = JSON.parse(p1.icons || '[]');
                const p2Icons = JSON.parse(p2.icons || '[]');
                const p1Zoins = p1.zoins || 0;
                const p2Zoins = p2.zoins || 0;

                // Validate items/zoins existence
                if (p1Zoins < session.p1.zoins || p2Zoins < session.p2.zoins) throw new Error('Insufficient Zoins');

                // Swap logic
                const p1NewIcons = p1Icons.filter(icon => !session.p1.items.includes(icon.id || icon));
                const p2NewIcons = p2Icons.filter(icon => !session.p2.items.includes(icon.id || icon));

                const p1Received = p2Icons.filter(icon => session.p2.items.includes(icon.id || icon));
                const p2Received = p1Icons.filter(icon => session.p1.items.includes(icon.id || icon));

                const newP1Icons = [...p1NewIcons, ...p1Received];
                const newP2Icons = [...newP2Icons, ...p2Received];

                const newP1Zoins = p1Zoins - (session.p1.zoins || 0) + (session.p2.zoins || 0);
                const newP2Zoins = p2Zoins - (session.p2.zoins || 0) + (session.p1.zoins || 0);

                sqliteDb.prepare('UPDATE users SET zoins = ?, icons = ? WHERE uid = ?')
                    .run(newP1Zoins, JSON.stringify(newP1Icons), session.p1.uid);
                sqliteDb.prepare('UPDATE users SET zoins = ?, icons = ? WHERE uid = ?')
                    .run(newP2Zoins, JSON.stringify(newP2Icons), session.p2.uid);
            })();

            tradeSessions.delete(tradeId);
            io.to(tradeId).emit('trade_completed');

            syncUserInventory(session.p1.uid);
            syncUserInventory(session.p2.uid);

            callback?.({ success: true });
        } catch (err) {
            console.error('[TRADE] Execution error:', err);
            callback?.({ success: false, error: err.message });
        }
    });

    socket.on('trade_cancel', ({ tradeId }) => {
        const session = tradeSessions.get(tradeId);
        if (session) {
            tradeSessions.delete(tradeId);
            io.to(session.p1.uid).to(session.p2.uid).emit('trade_cancelled');
        }
    });

    // --- [CRAFTING] HANDLER ---
    socket.on('craft_item', async ({ recipeId, itemIds }, callback) => {
        const userId = socket.userId;
        const recipe = CRAFTING_RECIPES[recipeId];
        if (!recipe || !userId) return callback?.({ success: false, error: 'Invalid recipe or not authenticated' });

        try {
            const result = sqliteDb.transaction(() => {
                const user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(userId);
                if (!user) throw new Error('User not found');

                const ownedIcons = JSON.parse(user.icons || '[]');
                const zoins = user.zoins || 0;

                // Validate Zoins
                if ((recipe.cost || 0) > zoins) throw new Error('Insufficient Zoins');

                // Validate specified items exist in inventory
                const ownedIconIds = ownedIcons.map(i => (typeof i === 'string' || typeof i === 'number' ? i : i.id));

                for (const id of itemIds) {
                    const idx = ownedIconIds.indexOf(id);
                    if (idx === -1) throw new Error(`Item ${id} not found in inventory`);

                    // Check tier if recipe specifies it (requires ICONS_DATA lookup)
                    if (recipe.input.tier !== 'any') {
                        const iconData = ICONS_DATA[id];
                        if (!iconData || iconData.tier !== recipe.input.tier) {
                            throw new Error(`Item ${id} does not match required tier ${recipe.input.tier}`);
                        }
                    }
                }

                if (itemIds.length !== recipe.input.count) throw new Error('Incorrect input count');

                // Remove items
                let remainingIcons = [...ownedIcons];
                for (const id of itemIds) {
                    const idx = remainingIcons.findIndex(i => (typeof i === 'string' || typeof i === 'number' ? i === id : i.id === id));
                    if (idx !== -1) {
                        remainingIcons.splice(idx, 1);
                    }
                }

                // Add output or Zoins
                let rewardLabel = '';
                let newZoins = zoins - (recipe.cost || 0);

                if (recipe.output.tier !== undefined) {
                    // Select random icon of target tier
                    const tierIcons = Object.values(ICONS_DATA).filter(icon => icon.tier === recipe.output.tier);
                    if (tierIcons.length === 0) throw new Error('No icons available for target tier');
                    const newIcon = tierIcons[Math.floor(Math.random() * tierIcons.length)];
                    remainingIcons.push({
                        id: newIcon.id,
                        xp: 0,
                        level: 1,
                        unlockedAt: Date.now()
                    });
                    rewardLabel = `New ${newIcon.name} (Tier ${recipe.output.tier})!`;
                } else if (recipe.output.zoins) {
                    newZoins += recipe.output.zoins;
                    rewardLabel = `+${recipe.output.zoins} Zoins`;
                }

                sqliteDb.prepare('UPDATE users SET icons = ?, zoins = ? WHERE uid = ?')
                    .run(JSON.stringify(remainingIcons), newZoins, userId);

                return { success: true, reward: rewardLabel };
            })();

            syncUserInventory(userId);
            callback?.(result);
        } catch (err) {
            console.error('Crafting Error:', err);
            callback?.({ success: false, error: err.message });
        }
    });

    // --- [PRO] SUBSCRIPTION SYSTEM ---
    socket.on('claim_pro_reward', async (callback) => {
        const userId = socket.userId;
        if (!userId) return callback?.({ success: false, error: 'Not authenticated' });

        try {
            const result = sqliteDb.transaction(() => {
                const user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(userId);
                if (!user) throw new Error('User not found');

                const isPro = user.is_pro || 0;
                const zoins = user.zoins || 0;
                const ownedIcons = JSON.parse(user.icons || '[]');

                if (!isPro) throw new Error('You must be a Pro member to claim these rewards.');

                const now = Date.now();
                const lastClaim = user.last_pro_reward || 0;
                const weekInMs = 7 * 24 * 60 * 60 * 1000;

                if (now - lastClaim < weekInMs) {
                    const daysLeft = Math.ceil((weekInMs - (now - lastClaim)) / (24 * 60 * 60 * 1000));
                    throw new Error(`Wait ${daysLeft} more days for your next weekly Pro reward.`);
                }

                // Grant Rewards: 1000 Zoins + 1 random Epic Icon
                const epics = Object.values(ICONS_DATA).filter(i => i.tier === 3);
                const rewardIcon = epics[Math.floor(Math.random() * epics.length)];

                const newIcons = [...ownedIcons];
                newIcons.push({
                    id: rewardIcon.id,
                    xp: 0,
                    level: 1,
                    unlockedAt: now
                });

                sqliteDb.prepare('UPDATE users SET zoins = zoins + 1000, icons = ?, last_pro_reward = ? WHERE uid = ?')
                    .run(JSON.stringify(newIcons), now, userId);

                return { success: true, reward: `Claimed 1,000 Zoins and ${rewardIcon.name}!` };
            })();

            syncUserInventory(userId);
            callback?.(result);
        } catch (err) {
            callback?.({ success: false, error: err.message });
        }
    });

    socket.on('disconnect', async () => {
        console.log(`Player disconnected: ${socket.id} `);

        // --- TIME TRACKING ---
        const durationSession = Date.now() - (socket.data.connectTime || Date.now());
        const durationSeconds = Math.floor(durationSession / 1000);

        // IP Exclusion Logic
        const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.request.connection.remoteAddress;
        const adminIps = (process.env.ADMIN_IPS || '').split(',').map(ip => ip.trim());

        // Check if IP is excluded (Admin)
        const isExcluded = adminIps.some(adminIp => clientIp.includes(adminIp)) || clientIp === '::1'; // Localhost often ::1

        if (!isExcluded && durationSeconds > 0) {
            try {
                // Update global stats in SQLite
                sqliteDb.transaction(() => {
                    const statsRow = sqliteDb.prepare("SELECT value FROM global_stats WHERE key = 'totalTimePlayedSeconds'").get();
                    let currentSeconds = 0;
                    if (statsRow) {
                        currentSeconds = parseInt(statsRow.value, 10) || 0;
                    }
                    const newSeconds = currentSeconds + durationSeconds;

                    sqliteDb.prepare("INSERT OR REPLACE INTO global_stats (key, value) VALUES ('totalTimePlayedSeconds', ?)")
                        .run(newSeconds.toString());
                    sqliteDb.prepare("INSERT OR REPLACE INTO global_stats (key, value) VALUES ('lastUpdated', ?)")
                        .run(new Date().toISOString());
                })();
                console.log(`⏱️ Logged ${durationSeconds}s play time (IP: ${clientIp})`);
            } catch (err) {
                console.error('Error logging time:', err.message);
            }
        } else {
            console.log(`🛡️ Admin/Localhost IP (${clientIp}) - Time not tracked.`);
        }

        // --- PRESENCE CLEANUP ---
        const presence = socketToUid.get(socket.id);
        if (presence) {
            const { uid } = presence;
            socketToUid.delete(socket.id);
            const userSockets = uidToSockets.get(uid);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    uidToSockets.delete(uid);
                    // Officially offline if no sessions remain
                    try {
                        sqliteDb.prepare('UPDATE users SET online_status = ?, last_seen = ? WHERE uid = ?')
                            .run('offline', new Date().toISOString(), uid);
                    } catch (e) { }
                }
            }
        }

        const roomCode = playerRooms.get(socket.id);
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                if (room.players.has(socket.id)) {
                    const playerData = room.players.get(socket.id);
                    // Store for reconnection
                    const timeout = setTimeout(() => {
                        const r = rooms.get(roomCode);
                        if (r) {
                            // Replace with BOT if permanent disconnect
                            const slotIndex = Array.from(r.players.keys()).indexOf(socket.id);
                            r.players.delete(socket.id);
                            playerRooms.delete(socket.id);

                            spawnBot(roomCode, slotIndex >= 0 ? slotIndex : 0);

                            io.to(roomCode).emit('playerLeft', { playerId: socket.id });
                            io.to(roomCode).emit('playerUpdate', getPlayersArray(r));

                            if (r.players.size === 0 && r.spectators.size === 0) {
                                rooms.delete(roomCode);
                            }
                        }
                        disconnectedPlayers.delete(socket.id);
                    }, 60000); // 1 minute window

                    disconnectedPlayers.set(socket.id, {
                        roomCode,
                        playerData,
                        timeout
                    });

                    // We don't remove them yet, just notify others they are "offline" or similar
                    // For now, let's keep it simple: they stay in the list but won't send inputs.
                    io.to(roomCode).emit('playerDisconnected', { playerId: socket.id });
                } else if (room.spectators.has(socket.id)) {
                    room.spectators.delete(socket.id);
                    io.to(roomCode).emit('spectatorUpdate', { count: room.spectators.size });
                }

                // Clean up empty rooms
                if (room.players.size === 0 && room.spectators.size === 0) {
                    if (room.loopInterval) clearInterval(room.loopInterval);
                    rooms.delete(roomCode);
                }
            }
            playerRooms.delete(socket.id);
        }
    });

    // Helper: Join room
    function joinRoom(socket, roomCode, playerName, userEmail, callback, skinData = {}, isSpectator = false) {
        const room = rooms.get(roomCode);

        if (isSpectator) {
            room.spectators.add(socket.id);
            playerRooms.set(socket.id, roomCode);
            socket.join(roomCode);

            callback({
                success: true,
                roomCode,
                playerId: socket.id,
                isSpectator: true,
                players: getPlayersArray(room),
                gameState: room.gameState
            });

            io.to(roomCode).emit('spectatorUpdate', { count: room.spectators.size });
            return;
        }

        const playerIndex = room.players.size;

        const player = {
            id: socket.id,
            name: playerName || `Player ${playerIndex + 1}`,
            email: userEmail || null,
            color: skinData.color || PLAYER_COLORS[playerIndex],
            skinId: skinData.skinId || null,
            skinTier: skinData.skinTier || 0,
            position: getSpawnPosition(playerIndex),
            velocity: [0, 0, 0],
            ready: false,
            score: 0,
            kills: 0,
            stomps: 0,
            damageDealt: 0,
            startTime: Date.now(),
            deathTime: null,
            lastActivity: Date.now(),
            afkWarned: false,
        };

        room.players.set(socket.id, player);
        playerRooms.set(socket.id, roomCode);
        socket.join(roomCode);

        callback({
            success: true,
            roomCode,
            playerId: socket.id,
            playerIndex,
            color: player.color,
            players: getPlayersArray(room),
        });

        // Notify others
        socket.to(roomCode).emit('playerJoined', player);
        io.to(roomCode).emit('playerUpdate', getPlayersArray(room));
    }

    // Helper: Spawn a bot
    function spawnBot(roomCode, slotIndex) {
        const room = rooms.get(roomCode);
        if (!room) return;

        const botId = `bot_${Math.random().toString(36).substring(2, 7)}`;
        const botNames = ['Puckinator', 'Slapshot_AI', 'Glidder', 'Orbit_Bot', 'Smasher', 'Drift_King'];
        const name = botNames[Math.floor(Math.random() * botNames.length)];

        const bot = {
            id: botId,
            name: `${name} [BOT]`,
            email: null,
            isBot: true,
            color: PLAYER_COLORS[slotIndex % PLAYER_COLORS.length],
            skinId: null,
            skinTier: 0,
            position: getSpawnPosition(slotIndex),
            velocity: [0, 0, 0],
            ready: true,
            score: 0,
            lastActivity: Date.now(),
            afkWarned: false,
            input: { moveX: 0, moveZ: 0, jump: false, dash: false }
        };

        room.players.set(botId, bot);
        io.to(roomCode).emit('playerUpdate', getPlayersArray(room));
        console.log(`🤖 Bot ${name} joined room ${roomCode}`);
        return botId;
    }

    // Helper: Get spawn positions (around the arena)
    function getSpawnPosition(index) {
        const positions = [
            [-5, 1, 0],
            [5, 1, 0],
            [0, 1, -5],
            [0, 1, 5],
        ];
        return positions[index % 4];
    }

    // Helper: Start game
    function startGame(roomCode) {
        const room = rooms.get(roomCode);
        if (!room) return;

        room.gameState = 'playing';

        // Reset positions and fill with bots if needed
        let i = 0;
        for (const [, player] of room.players) {
            player.position = getSpawnPosition(i);
            player.score = 0;
            i++;
        }

        // BACKFILL BOTS if less than 4 players
        while (room.players.size < 4) {
            spawnBot(roomCode, i);
            i++;
        }

        io.to(roomCode).emit('gameStart', {
            players: getPlayersArray(room),
            selectedMap: room.selectedMap,
            seed: room.currentSeed || Math.floor(Math.random() * 1000000)
        });

        // Start server-side movement loop (22Hz)
        room.serverAuthoritative = true;
        startRoomLoop(roomCode);

        // Start powerup spawning
        spawnPowerups(roomCode);
    }

    // Helper: Start room physics loop
    function startRoomLoop(roomCode) {
        const room = rooms.get(roomCode);
        if (room.loopInterval) clearInterval(room.loopInterval);

        const dt = 1 / PHYSICS.tickRate;

        room.loopInterval = setInterval(() => {
            if (!room || room.gameState !== 'playing') {
                clearInterval(room.loopInterval);
                return;
            }

            const stateUpdate = {};
            room.tick++;
            const currentTickStates = {};

            room.players.forEach((player, id) => {
                const now = Date.now();
                let input = player.input || { moveX: 0, moveZ: 0, jump: false, dash: false };

                // --- BOT AI LOGIC ---
                if (player.isBot) {
                    // Find nearest non-bot target
                    let target = null;
                    let minDist = Infinity;
                    room.players.forEach((p, pId) => {
                        if (pId !== id && !p.isBot) {
                            const d = Math.sqrt((p.position[0] - player.position[0]) ** 2 + (p.position[2] - player.position[2]) ** 2);
                            if (d < minDist) {
                                minDist = d;
                                target = p;
                            }
                        }
                    });

                    if (target) {
                        // Move towards target
                        const dx = target.position[0] - player.position[0];
                        const dz = target.position[2] - player.position[2];
                        const mag = Math.sqrt(dx * dx + dz * dz) || 1;

                        input.moveX = dx / mag;
                        input.moveZ = dz / mag;

                        // Combat: Stomp if above target
                        if (player.position[1] > target.position[1] + 0.5 && minDist < 2.0) {
                            input.jump = true;
                        } else {
                            input.jump = false;
                        }

                        // Defense: Random dash if far or high damage (simulated)
                        if (minDist > 10 && Math.random() < 0.01) {
                            input.dash = true;
                        } else {
                            input.dash = false;
                        }
                    } else {
                        // Idle behavior
                        input.moveX = 0;
                        input.moveZ = 0;
                        input.jump = false;
                        input.dash = false;
                    }
                }

                // Simple Euler Integration
                // Acceleration
                player.velocity[0] += input.moveX * PHYSICS.accel * dt;
                player.velocity[2] += input.moveZ * PHYSICS.accel * dt;

                // Damping
                player.velocity[0] *= (1 - PHYSICS.damping);
                player.velocity[2] *= (1 - PHYSICS.damping);

                // Speed Cap
                const speed = Math.sqrt(player.velocity[0] ** 2 + player.velocity[2] ** 2);
                if (speed > PHYSICS.maxVelocity) {
                    player.velocity[0] = (player.velocity[0] / speed) * PHYSICS.maxVelocity;
                    player.velocity[2] = (player.velocity[2] / speed) * PHYSICS.maxVelocity;
                }

                // Apply velocity to position
                player.position[0] += player.velocity[0] * dt;
                player.position[1] += player.velocity[1] * dt;
                player.position[2] += player.velocity[2] * dt;

                // Gravity (simple Y check)
                if (player.position[1] > 1.1) {
                    player.velocity[1] += PHYSICS.gravity * dt;
                } else {
                    player.position[1] = 1;
                    player.velocity[1] = 0;
                    if (input.jump) {
                        player.velocity[1] = PHYSICS.jumpForce;
                    }
                }

                // Dash Impulse
                if (input.dash && (now - (player.lastDashTime || 0) > 2500)) {
                    let dashX = input.moveX;
                    let dashZ = input.moveZ;
                    if (dashX === 0 && dashZ === 0) dashZ = -1; // Default forward

                    const mag = Math.sqrt(dashX * dashX + dashZ * dashZ) || 1;
                    player.velocity[0] += (dashX / mag) * PHYSICS.dashForce;
                    player.velocity[2] += (dashZ / mag) * PHYSICS.dashForce;
                    player.lastDashTime = now;
                }

                // AFK Detection Check
                const idleTime = now - (player.lastActivity || now);
                if (idleTime > 60000) { // 60s Kick
                    console.log(`👢 AFK Kick: ${id} (Room: ${roomCode})`);
                    io.to(id).emit('afkKick', { reason: 'Inactivity' });
                    // Remove player logic
                    // Replace with BOT to keep game full
                    const slotIndex = Array.from(room.players.keys()).indexOf(id);
                    room.players.delete(id);
                    playerRooms.delete(id);

                    spawnBot(roomCode, slotIndex >= 0 ? slotIndex : 0);

                    io.to(roomCode).emit('playerLeft', id);
                    io.to(roomCode).emit('playerUpdate', getPlayersArray(room));
                    return; // Skip state update for this player
                } else if (idleTime > 45000 && !player.afkWarned) { // 45s Warning
                    player.afkWarned = true;
                    io.to(id).emit('afkWarning', { timeLeft: 15 });
                    console.log(`⚠️ AFK Warning: ${id}`);
                } else if (idleTime < 45000) {
                    player.afkWarned = false; // Reset if they moved
                }

                stateUpdate[id] = {
                    p: player.position,
                    v: player.velocity,
                    i: id
                };

                currentTickStates[id] = {
                    p: [...player.position],
                    v: [...player.velocity]
                };

                // --- NEW: BOT HIT DETECTION & COLLECTION ---
                if (player.isBot) {
                    // 1. Bot Stomp Detection (Against Humans)
                    room.players.forEach((target, targetId) => {
                        if (targetId !== id && !target.isBot) {
                            const dx = target.position[0] - player.position[0];
                            const dy = target.position[1] - player.position[1];
                            const dz = target.position[2] - player.position[2];
                            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                            // If bot is above and close
                            if (dy < -0.5 && dist < 1.5) {
                                target.damage = (target.damage || 0) + 10;
                                io.to(roomCode).emit('stomp', { attackerId: id, targetId, damage: 10 });
                                io.to(roomCode).emit('damageUpdate', { playerId: targetId, damage: target.damage });
                                // Small bounce for bot
                                player.velocity[1] = 5;
                            }
                        }
                    });

                    // 2. Bot Powerup Collection
                    if (room.powerups && room.powerups.length > 0) {
                        for (let pIdx = room.powerups.length - 1; pIdx >= 0; pIdx--) {
                            const pu = room.powerups[pIdx];
                            const dist = Math.sqrt(
                                (pu.p[0] - player.position[0]) ** 2 +
                                (pu.p[1] - player.position[1]) ** 2 +
                                (pu.p[2] - player.position[2]) ** 2
                            );
                            if (dist < 2.0) {
                                console.log(`🤖 Bot ${player.name} collected powerup ${pu.type}`);
                                room.powerups.splice(pIdx, 1);
                                io.to(roomCode).emit('powerupCollected', { powerupId: pu.id, playerId: id });
                            }
                        }
                    }
                }
            });

            // Store in history
            room.history.set(room.tick, currentTickStates);

            // Limit history to 60 ticks (~2.7 seconds at 22Hz)
            if (room.history.size > 60) {
                const oldestTick = room.tick - 60;
                room.history.delete(oldestTick);
            }

            // Broadcast compressed state update with tick
            io.to(roomCode).emit('roomState', {
                s: stateUpdate,
                t: room.tick
            });
        }, 1000 / PHYSICS.tickRate);
    }

    // Helper: Spawn powerups periodically
    function spawnPowerups(roomCode) {
        const interval = setInterval(() => {
            const room = rooms.get(roomCode);
            if (!room || room.gameState !== 'playing') {
                clearInterval(interval);
                return;
            }

            if (room.powerups.length < 3) {
                const powerup = {
                    id: `pw_${Date.now()} `,
                    type: ['speed', 'damage', 'shield', 'superboost'][Math.floor(Math.random() * 4)],
                    position: [
                        (Math.random() - 0.5) * 10,
                        1.5,
                        (Math.random() - 0.5) * 10,
                    ],
                };
                room.powerups.push(powerup);
                io.to(roomCode).emit('powerupSpawned', powerup);
            }
        }, 8000 + Math.random() * 4000);
    }

    // Helper: Get players as array
    function getPlayersArray(room) {
        return Array.from(room.players.values());
    }

    function calculateHonors(room) {
        const players = Array.from(room.players.values());
        if (players.length === 0) return {};

        const honors = {
            mvp: null,
            damageDealer: null,
            stompMaster: null,
            survivalist: null
        };

        // 1. MVP: Highest Score (Kills)
        honors.mvp = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0];

        // 2. Damage Dealer: Most Damage Dealt
        honors.damageDealer = [...players].sort((a, b) => (b.damageDealt || 0) - (a.damageDealt || 0))[0];

        // 3. Stomp Master: Most Stomps
        honors.stompMaster = [...players].sort((a, b) => (b.stomps || 0) - (a.stomps || 0))[0];

        // 4. Survivalist: Longest survival or latest death
        honors.survivalist = [...players].sort((a, b) => {
            const aTime = a.deathTime ? (a.deathTime - a.startTime) : (Date.now() - a.startTime);
            const bTime = b.deathTime ? (b.deathTime - b.startTime) : (Date.now() - b.startTime);
            return bTime - aTime;
        })[0];

        // Format for client
        const formatPlayer = (p) => p ? { id: p.id, name: p.name, email: p.email, uid: p.uid, value: 0 } : null;

        return {
            mvp: { ...formatPlayer(honors.mvp), value: honors.mvp?.score || 0 },
            damageDealer: { ...formatPlayer(honors.damageDealer), value: honors.damageDealer?.damageDealt || 0 },
            stompMaster: { ...formatPlayer(honors.stompMaster), value: honors.stompMaster?.stomps || 0 },
            survivalist: { ...formatPlayer(honors.survivalist), value: Math.floor(((honors.survivalist?.deathTime || Date.now()) - (honors.survivalist?.startTime || Date.now())) / 1000) }
        };
    }

    function getScoresObject(room) {
        const scores = {};
        for (const [id, player] of room.players) {
            scores[id] = player.score || 0;
        }
        return scores;
    }

    // Helper: Award Game Rewards (1 Pack for Winner, 0.5 Credit for others)
    async function awardGameRewards(room, winnerId) {
        console.log('🏆 Awarding game rewards...');

        for (const [playerId, player] of room.players) {
            if (!player.email) {
                console.log(`⚠️ Player ${player.name} has no email, skipping reward.`);
                continue;
            }

            try {
                // Determine reward (Zoins)
                const isWinner = playerId === winnerId;
                let zoinReward = 10; // MATCH_COMPLETE

                // Win Bonus
                if (isWinner) zoinReward += 50; // WIN

                // Kill Bonus
                const kills = player.score || 0;
                zoinReward += (kills * 10); // KILL

                // Get user doc
                const user = sqliteDb.prepare('SELECT * FROM users WHERE email = ?').get(player.email);
                if (!user) continue;

                const uid = user.uid;

                const result = sqliteDb.transaction(() => {
                    const currentUser = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(uid);
                    if (!currentUser) return null;

                    const currentZoins = (currentUser.zoins || 0) + zoinReward;

                    // Calculate Rank Points (RP)
                    const rpGain = isWinner ? 50 : -20;
                    const killRP = (player.score || 0) * 5;
                    const totalRPChange = rpGain + killRP;
                    const newRankPoints = Math.max(0, (currentUser.rank_points || 0) + totalRPChange);

                    // Update Daily Quests
                    let quests = [];
                    try {
                        quests = JSON.parse(currentUser.daily_quests || '[]');
                    } catch (e) {
                        quests = [];
                    }
                    let questZoins = 0;

                    quests = quests.map(q => {
                        if (q.completed) return q;
                        let progressed = 0;
                        if (q.id === 'win_1' && isWinner) progressed = 1;
                        if (q.id === 'stomp_5' && kills > 0) progressed = kills;
                        if (q.id === 'play_3') progressed = 1;
                        if (q.id === 'survive_2' && room.players.size >= 3) {
                            if (isWinner) progressed = 1;
                        }

                        if (progressed > 0) {
                            q.progress += progressed;
                            if (q.progress >= q.goal) {
                                q.progress = q.goal;
                                q.completed = true;
                                questZoins += q.reward;
                            }
                        }
                        return q;
                    });

                    const XP_WIN_BONUS = 500;
                    const XP_KNOCKOUT = 100;
                    const xpGain = (isWinner ? XP_WIN_BONUS : 0) + (kills * XP_KNOCKOUT);

                    // [PHASE 3] Update Puck-specific stats if puckId provided
                    const puckId = player.skinData?.puckId;
                    if (puckId) {
                        const puck = sqliteDb.prepare('SELECT * FROM pucks WHERE id = ? AND user_id = ?').get(puckId, uid);
                        if (!puck) {
                            sqliteDb.prepare(`
                                INSERT INTO pucks (id, user_id, icon_id, tier, xp, stats, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `).run(puckId, uid, player.skinData?.iconId || 1001, 0, xpGain, JSON.stringify({
                                wins: isWinner ? 1 : 0,
                                kills: kills,
                                losses: isWinner ? 0 : 1,
                                lastPlayed: new Date().toISOString()
                            }), new Date().toISOString());
                        } else {
                            const puckStats = JSON.parse(puck.stats || '{}');
                            puckStats.wins = (puckStats.wins || 0) + (isWinner ? 1 : 0);
                            puckStats.kills = (puckStats.kills || 0) + kills;
                            puckStats.losses = (puckStats.losses || 0) + (isWinner ? 0 : 1);
                            puckStats.lastPlayed = new Date().toISOString();

                            sqliteDb.prepare(`
                                UPDATE pucks 
                                SET xp = xp + ?, stats = ? 
                                WHERE id = ? AND user_id = ?
                            `).run(xpGain, JSON.stringify(puckStats), puckId, uid);
                        }
                    }

                    // Update user record
                    sqliteDb.prepare(`
                        UPDATE users 
                        SET zoins = ?, rank_points = ?, xp = xp + ?, wins = wins + ?, kills = kills + ?, daily_quests = ?
                        WHERE uid = ?
                    `).run(
                        currentZoins + questZoins,
                        newRankPoints,
                        xpGain,
                        isWinner ? 1 : 0,
                        kills,
                        JSON.stringify(quests),
                        uid
                    );

                    return {
                        zoins: zoinReward,
                        newRankPoints,
                        totalRPChange,
                        xpGain
                    };
                })();

                if (result) {
                    console.log(`🎁 ${player.email}: Earned ${zoinReward} Zoins, RP: ${result.totalRPChange > 0 ? '+' : ''}${result.totalRPChange}, Kills: ${kills}`);

                    syncUserInventory(uid);
                    if (player.skinData?.puckId) {
                        syncUserPucks(uid);
                    }

                    // Notify client of reward
                    io.to(playerId).emit('rewardEarned', {
                        zoins: zoinReward,
                        isWinner,
                        rpChange: result.totalRPChange,
                        totalRP: result.newRankPoints,
                        xpGain: result.xpGain
                    });
                }

            } catch (error) {
                console.error(`❌ Error awarding reward to ${player.email}:`, error);
            }
        }
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', rooms: rooms.size });
});

// Runs every 2.5 seconds to group players
setInterval(() => {
    if (matchmakingQueue.size === 0) return;

    const allPlayers = Array.from(matchmakingQueue.values());
    const now = Date.now();

    // Group players into "Buckets" by wagerAmount
    const buckets = {};
    allPlayers.forEach(p => {
        const key = p.wagerAmount || 0;
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(p);
    });

    Object.keys(buckets).forEach(wager => {
        const players = buckets[wager];

        // Group players into rooms of 4
        while (players.length >= 4) {
            const group = players.splice(0, 4);
            createMatch(group, parseInt(wager));
        }

        // For remaining players, check if they've been waiting too long (> 10s)
        if (players.length > 0) {
            const oldestEntry = players.sort((a, b) => a.joinedAt - b.joinedAt)[0];
            if (now - oldestEntry.joinedAt > 10000) {
                // Force start a match (bots will be added in room logic)
                const group = players.splice(0, players.length);
                createMatch(group, parseInt(wager));
            }
        }
    });
}, 2500);

function createMatch(playerEntries, wagerAmount = 0) {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log(`🎮 Matchmaking: Creating room ${roomCode} for ${playerEntries.length} players [WAGER: ${wagerAmount}]`);

    // Use the existing rooms Map and logic
    const room = {
        code: roomCode,
        players: new Set(),
        gameState: 'lobby',
        scores: {},
        startTime: null,
        lastTick: Date.now(),
        tickInterval: null,
        selectedMap: 'PROCEDURAL',
        selectedMode: 'knockout',
        seed: Math.floor(Math.random() * 1000000),
        mapVotes: {},
        spectators: new Set(),
        wagerAmount // [NEW] Store wager in room metadata
    };

    rooms.set(roomCode, room);

    playerEntries.forEach((entry, index) => {
        const { socket } = entry;

        // Remove from queue
        matchmakingQueue.delete(socket.id);

        // Tell client to join this room
        socket.emit('matchFound', { roomCode });
    });
}

const PORT = process.env.SERVER_PORT || process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`🎮 Puck Arena Server running on port ${PORT} `);
    // Start shop rotation now that io is available
    rotateShop();
    io.emit('shop_update', currentShop);
    setInterval(() => {
        rotateShop();
        io.emit('shop_update', currentShop);
    }, 24 * 60 * 60 * 1000);
});
