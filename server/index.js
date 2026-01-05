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

// Now apply JSON parsing for other routes
app.use(cors());
app.use(express.json());

// ============ PLAYER INVENTORY (In-memory, use DB in production) ============
const playerInventories = new Map(); // Map<email, { icons: number[], freePacks: number }>

// Pack contents configuration
const PACK_CONTENTS = {
    'single': { packs: 1, slots: 3 },
    'bundle10': { packs: 10, slots: 30 },
    'unlockAll': { packs: 0, slots: 150, unlockAll: true }
};

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
    switch (event.type) {
        case 'checkout.session.completed':
        case 'payment_intent.succeeded':
            const session = event.data.object;
            console.log('💰 Payment succeeded:', session.id);

            // Get customer email and product info from metadata
            const email = session.customer_email || session.metadata?.email;
            const packType = session.metadata?.packType || 'single';

            if (email) {
                await fulfillPurchase(email, packType);
            }
            break;

        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object;
            console.error('❌ Payment failed:', failedIntent.id, failedIntent.last_payment_error?.message);
            // Optionally notify user via email/socket
            break;

        default:
            console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
}

// ============ FULFILLMENT LOGIC ============
async function fulfillPurchase(email, packType) {
    console.log(`📦 Fulfilling ${packType} for ${email}`);

    // Get or create player inventory
    if (!playerInventories.has(email)) {
        playerInventories.set(email, { icons: [], freePacks: 0 });
    }
    const inventory = playerInventories.get(email);

    const packConfig = PACK_CONTENTS[packType] || PACK_CONTENTS.single;

    if (packConfig.unlockAll) {
        // Unlock all 150 icons
        inventory.icons = Array.from({ length: 150 }, (_, i) => i + 1);
        console.log(`🐋 Whale unlock complete for ${email}`);
    } else {
        // Grant packs (icons will be opened on client)
        inventory.freePacks += packConfig.packs;
        console.log(`🎁 Granted ${packConfig.packs} packs to ${email}`);
    }

    // In production: Save to database, send confirmation email, etc.
    return inventory;
}

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
                }
                .container { text-align: center; }
                h1 { color: #00ff87; font-size: 3rem; }
                p { color: #888; font-size: 1.2rem; }
                .btn {
                    display: inline-block;
                    background: linear-gradient(45deg, #00ff87, #00d4ff);
                    color: black;
                    padding: 1rem 2rem;
                    border-radius: 30px;
                    text-decoration: none;
                    font-weight: bold;
                    margin-top: 2rem;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🎉 Payment Successful!</h1>
                <p>Your packs are being added to your account.</p>
                <p>Return to the game to open them!</p>
                <a href="/" class="btn">Back to Game</a>
            </div>
            <script>
                // Auto-redirect after 3 seconds
                setTimeout(() => window.location.href = '/', 3000);
            </script>
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
                }
                .container { text-align: center; }
                h1 { color: #ff006e; font-size: 3rem; }
                p { color: #888; font-size: 1.2rem; }
                .btn {
                    display: inline-block;
                    background: rgba(255,255,255,0.1);
                    color: white;
                    padding: 1rem 2rem;
                    border-radius: 30px;
                    text-decoration: none;
                    font-weight: bold;
                    margin-top: 2rem;
                    border: 1px solid #444;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Payment Cancelled</h1>
                <p>No worries! Your payment was not processed.</p>
                <a href="/" class="btn">Back to Game</a>
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

// Generate random room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Player colors
const PLAYER_COLORS = ['#00d4ff', '#ff006e', '#00ff87', '#9d4edd'];

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Create a new room
    socket.on('createRoom', (callback) => {
        const roomCode = generateRoomCode();
        rooms.set(roomCode, {
            players: new Map(),
            powerups: [],
            gameState: 'waiting',
            hostId: socket.id,
        });

        joinRoom(socket, roomCode, callback);
    });

    // Join existing room
    socket.on('joinRoom', ({ roomCode }, callback) => {
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

        joinRoom(socket, code, callback);
    });

    // Quick join - find or create room
    socket.on('quickJoin', (callback) => {
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

        joinRoom(socket, roomCode, playerName, callback);
    });

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
                room.gameState = 'playing';
                io.to(roomCode).emit('gameStart', {
                    players: playersList,
                    selectedMap: room.selectedMap || 'SAWBLADE CITY' // Default map
                });
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
        }
    });

    // Power-up collected
    socket.on('powerupCollected', ({ powerupId }) => {
        const roomCode = playerRooms.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Remove powerup and broadcast
        room.powerups = room.powerups.filter(p => p.id !== powerupId);
        io.to(roomCode).emit('powerupRemoved', { powerupId, collectorId: socket.id });
    });

    // Disconnect
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

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
    function joinRoom(socket, roomCode, callback) {
        const room = rooms.get(roomCode);
        const playerIndex = room.players.size;

        const player = {
            id: socket.id,
            color: PLAYER_COLORS[playerIndex],
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
        for (const [id, player] of room.players) {
            player.position = getSpawnPosition(i);
            player.score = 0;
            i++;
        }

        io.to(roomCode).emit('gameStart', {
            players: getPlayersArray(room),
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
                    id: `pw_${Date.now()}`,
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
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', rooms: rooms.size });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    console.log(`🎮 Puck Arena Server running on port ${PORT}`);
});
