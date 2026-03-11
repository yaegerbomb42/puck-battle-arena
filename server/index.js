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

// --- MAINTENANCE ENDPOINT (For GitHub Actions) ---
let activeMaintenance = null; // Store active state { endTime, duration, message }

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
    console.warn('⚠️ using MOCK DATABASE (In-Memory) - Payments/Auth will not persist!');
    db = new MockFirestore();
    auth = new MockAuth();
}

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
        let userRecord;
        try {
            userRecord = await auth.getUserByEmail(email);
        } catch (e) {
            // User doesn't exist, create them
            console.log(`✨ Creating new user for ${email}`);
            userRecord = await auth.createUser({ email });
        }

        const uid = userRecord.uid;
        const userRef = db.collection('users').doc(uid);
        const docSnap = await userRef.get();

        let userData = docSnap.exists ? docSnap.data() : {
            email, icons: [], zoins: 0 // Default 0 Zoins
        };

        let zoinsToAdd = 0;
        // UPDATED VALUES TO MATCH ECONOMY.JS
        if (packType === 'pouch') zoinsToAdd = 900;
        else if (packType === 'cache') zoinsToAdd = 3800;
        else if (packType === 'vault') zoinsToAdd = 16000;
        else if (packType === 'bundle10') zoinsToAdd = 2500; // Legacy mapping
        else if (packType === 'single') zoinsToAdd = 500; // Legacy mapping

        if (packType === 'unlockAll') {
            userData.icons = Array.from({ length: 150 }, (_, i) => i + 1);
            userData.zoins = (userData.zoins || 0) + 50000; // Bonus for whale
            console.log(`🐋 Whale unlock complete for ${email}`);
        } else {
            userData.zoins = (userData.zoins || 0) + zoinsToAdd;
            console.log(`🎁 Granted ${zoinsToAdd} Zoins to ${email}`);
        }

        const paymentData = {
            userId: uid,
            email,
            packType,
            amount: packType === 'unlockAll' ? 9999 : (packType === 'bundle10' ? 300 : 50),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'completed',
            method: 'admin_bypass'
        };
        await db.collection('payments').add(paymentData);
        console.log('💰 Payment recorded in history');

        await userRef.set(userData, { merge: true });
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
        const statsDoc = await db.collection('stats').doc('global').get();
        if (statsDoc.exists) {
            totalTimePlayedSeconds = statsDoc.data().totalTimePlayedSeconds || 0;
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

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Player colors
const PLAYER_COLORS = ['#00d4ff', '#ff006e', '#00ff87', '#9d4edd'];

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id} `);

    // 📢 Send Maintenance Warning to new connections if active
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

    // Create a new room
    socket.on('createRoom', ({ playerName, userEmail, skinData }, callback) => {
        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
            players: new Map(),
            powerups: [],
            gameState: 'waiting',
            hostId: socket.id,
        });

        joinRoom(socket, roomCode, playerName, userEmail, callback, skinData);
    });

    // Join existing room
    socket.on('joinRoom', ({ roomCode, playerName, userEmail, skinData }, callback) => {
        const code = roomCode.toUpperCase();
        if (!rooms.has(code)) {
            callback({ success: false, error: 'Room not found' });
            return;
        }

        const room = rooms.get(code);
        if (room.players.size >= 4) {
            callback({ success: false, error: 'Room is full' });
            return;
        }

        joinRoom(socket, code, playerName, userEmail, callback, skinData);
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
                powerups: [],
                gameState: 'waiting',
                hostId: socket.id,
                selectedMap: 'SAWBLADE CITY', // Default map
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

    // Player position update
    socket.on('playerPosition', ({ position, velocity, rotation }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room || room.gameState !== 'playing') return;

        const player = room.players.get(socket.id);
        if (player) {
            player.position = position;
            player.velocity = velocity;
            player.rotation = rotation;

            // Broadcast to others in room
            socket.to(roomCode).emit('playerMoved', {
                playerId: socket.id,
                position,
                velocity,
                rotation,
            });
        }
    });

    // Player damage update
    socket.on('playerDamage', ({ damage }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (player) {
            player.damage = damage;
            // Broadcast update
            io.to(roomCode).emit('damageUpdate', { playerId: socket.id, damage });
        }
    });

    // Player knockout
    socket.on('playerKnockout', ({ knockedOutId }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Increment scorer's score
        const scorer = room.players.get(socket.id);
        if (scorer) {
            scorer.score = (scorer.score || 0) + 1;
        }

        io.to(roomCode).emit('knockout', {
            scorerId: socket.id,
            knockedOutId,
            scores: getScoresObject(room),
        });

        // Check win condition (first to 5)
        if (scorer && scorer.score >= 5) {
            io.to(roomCode).emit('gameOver', {
                winnerId: socket.id,
                scores: getScoresObject(room),
            });
            room.gameState = 'ended';

            // Award packs/credits to all players
            awardGameRewards(room, socket.id);
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
                // Update global stats in Firestore
                const statsRef = db.collection('stats').doc('global');
                await statsRef.set({
                    totalTimePlayedSeconds: admin.firestore.FieldValue.increment(durationSeconds),
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log(`⏱️ Logged ${durationSeconds}s play time (IP: ${clientIp})`);
            } catch (err) {
                console.error('Error logging time:', err.message);
            }
        } else {
            console.log(`🛡️ Admin/Localhost IP (${clientIp}) - Time not tracked.`);
        }

        const roomCode = playerRooms.get(socket.id);
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                room.players.delete(socket.id);
                io.to(roomCode).emit('playerLeft', { playerId: socket.id });
                io.to(roomCode).emit('playerUpdate', getPlayersArray(room));

                // Clean up empty rooms
                if (room.players.size === 0) {
                    rooms.delete(roomCode);
                }
            }
            playerRooms.delete(socket.id);
        }
    });

    // Helper: Join room
    function joinRoom(socket, roomCode, playerName, userEmail, callback, skinData = {}) {
        const room = rooms.get(roomCode);
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

        // Reset positions
        let i = 0;
        for (const [, player] of room.players) {
            player.position = getSpawnPosition(i);
            player.score = 0;
            i++;
        }

        io.to(roomCode).emit('gameStart', {
            players: getPlayersArray(room),
            selectedMap: room.selectedMap,
            seed: room.currentSeed || Math.floor(Math.random() * 1000000)
        });

        // Start powerup spawning
        spawnPowerups(roomCode);
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

    // Helper: Get scores object
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
                // Base reward for match completion
                let zoinReward = 10;

                // Win Bonus
                if (isWinner) zoinReward += 50;

                // Kill Bonus (using score as proxy for kills)
                const kills = player.score || 0;
                zoinReward += (kills * 5);

                // Get user doc
                const userQuery = await admin.auth().getUserByEmail(player.email).catch(() => null);
                if (!userQuery) continue;

                const userRef = db.collection('users').doc(userQuery.uid);

                await db.runTransaction(async (t) => {
                    const doc = await t.get(userRef);
                    if (!doc.exists) return;

                    const data = doc.data();
                    const currentZoins = (data.zoins || 0) + zoinReward;

                    t.update(userRef, {
                        zoins: currentZoins
                    });

                    console.log(`🎁 ${player.email}: Earned ${zoinReward} Zoins.`);

                    // Notify client of reward
                    io.to(playerId).emit('rewardEarned', {
                        zoins: zoinReward,
                        isWinner
                    });
                });

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

const PORT = process.env.SERVER_PORT || process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`🎮 Puck Arena Server running on port ${PORT} `);
});
