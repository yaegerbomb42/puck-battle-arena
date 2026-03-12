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
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
        console.error('❌ FATAL: FIREBASE_SERVICE_ACCOUNT_BASE64 is missing in production!');
        process.exit(1);
    }
    console.warn('⚠️ using MOCK DATABASE (In-Memory) - Payments/Auth will not persist!');
    db = new MockFirestore();
    auth = new MockAuth();
}

// Ensure Stripe is configured in production
if (process.env.NODE_ENV === 'production' && (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_YOUR_KEY')) {
    console.error('❌ FATAL: STRIPE_SECRET_KEY is missing or default in production!');
    process.exit(1);
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
const matchmakingQueue = new Map(); // [NEW] { socketId: { playerName, userEmail, skinData, joinedAt } }
const disconnectedPlayers = new Map(); // [NEW] { playerId: { roomCode, playerData, timeout } }

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
    socket.on('startMatchmaking', ({ playerName, userEmail, skinData }) => {
        console.log(`🔍 Player joined matchmaking: ${playerName} (${socket.id})`);
        matchmakingQueue.set(socket.id, {
            socket,
            playerName,
            userEmail,
            skinData,
            joinedAt: Date.now()
        });
        socket.emit('matchmakingUpdate', { status: 'searching' });
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
                const distFromCenter = Math.sqrt(victimState.p[0]**2 + victimState.p[2]**2);
                if (distFromCenter < 8 && !tick) {
                    console.warn(`🛡️ Suspicious Knockout: ${knockedOutId} reported far from edge.`);
                    // We allow it but log it
                }
            }
        }

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
                if (victim) {
                    victim.damage = (victim.damage || 0) + (damage || 5);
                    io.to(roomCode).emit('stomp', { attackerId: socket.id, targetId, damage: damage || 5 });
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
                            const d = Math.sqrt((p.position[0] - player.position[0])**2 + (p.position[2] - player.position[2])**2);
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
                        const mag = Math.sqrt(dx*dx + dz*dz) || 1;
                        
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
                            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

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
                                (pu.p[0] - player.position[0])**2 + 
                                (pu.p[1] - player.position[1])**2 + 
                                (pu.p[2] - player.position[2])**2
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
                // [TIE INTO ECONOMY.JS]
                let zoinReward = 10; // MATCH_COMPLETE

                // Win Bonus
                if (isWinner) zoinReward += 50; // WIN

                // Kill Bonus (using score as proxy for kills)
                const kills = player.score || 0;
                zoinReward += (kills * 10); // KILL

                // Get user doc
                const userQuery = await admin.auth().getUserByEmail(player.email).catch(() => null);
                if (!userQuery) continue;

                const userRef = db.collection('users').doc(userQuery.uid);

                await db.runTransaction(async (t) => {
                    const doc = await t.get(userRef);
                    if (!doc.exists) return;

                    const data = doc.data();
                    const currentZoins = (data.zoins || 0) + zoinReward;

                    // Calculate Rank Points (RP)
                    // Win: +50, Kill: +5, Loss: -20 (minimum 0 total RP)
                    const rpGain = isWinner ? 50 : -20;
                    const killRP = (player.score || 0) * 5;
                    const totalRPChange = rpGain + killRP;
                    const newRankPoints = Math.max(0, (data.rankPoints || 0) + totalRPChange);

                    t.update(userRef, {
                        zoins: currentZoins,
                        rankPoints: newRankPoints
                    });

                    console.log(`🎁 ${player.email}: Earned ${zoinReward} Zoins, RP: ${totalRPChange > 0 ? '+' : ''}${totalRPChange}`);

                    // Notify client of reward
                    io.to(playerId).emit('rewardEarned', {
                        zoins: zoinReward,
                        isWinner,
                        rpChange: totalRPChange,
                        totalRP: newRankPoints
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

// ============ MATCHMAKING TICK ============
// Runs every 2.5 seconds to group players
setInterval(() => {
    if (matchmakingQueue.size === 0) return;

    const players = Array.from(matchmakingQueue.values());
    const now = Date.now();
    
    // Group players into rooms of 4
    while (players.length >= 4) {
        const group = players.splice(0, 4);
        createMatch(group);
    }

    // For remaining players, check if they've been waiting too long (> 10s)
    if (players.length > 0) {
        const oldestEntry = players.sort((a, b) => a.joinedAt - b.joinedAt)[0];
        if (now - oldestEntry.joinedAt > 10000) {
            // Force start a match with 1-3 players (bots will be added in room logic)
            const group = players.splice(0, players.length);
            createMatch(group);
        }
    }
}, 2500);

function createMatch(playerEntries) {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log(`🎮 Matchmaking: Creating room ${roomCode} for ${playerEntries.length} players`);
    
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
        spectators: new Set()
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
});
