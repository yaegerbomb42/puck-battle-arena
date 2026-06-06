import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { XP_WIN_BONUS, XP_KNOCKOUT, XP_STOMP } from '../utils/leveling';
import { createPuckInstance } from '../utils/puckLeveling';
import { socket } from '../services/socket';
import { CONFIG } from '../utils/config';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

// Custom stubs to mirror Firebase SDK functions natively
export const increment = (value) => ({ _type: 'increment', value });
export const arrayUnion = (value) => ({ _type: 'arrayUnion', value });
export const arrayRemove = (value) => ({ _type: 'arrayRemove', value });

// Default inventory structure
const DEFAULT_INVENTORY = {
    icons: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010], // Users start with all standard colors
    username: null, // [NEW] Added username field
    following: [], // [NEW] Followed user UIDs
    equippedIcon: 1001, // Default to Red
    skins: [],
    equippedSkin: null,
    credits: 0, // Legacy
    zoins: 0, // [NEW] Premium Currency
    freePacks: 1,
    packCredits: 0, // Legacy
    banUntil: null,
    consecutiveQuits: 0,
    xp: 0, // [NEW] Experience Points
    timePlayed: 0, // [NEW] Total minutes played
    loadouts: [
        ['speed_boost', 'rocket', 'shield'],
        ['teleport', 'bomb_throw', 'ghost'],
        ['giant', 'freeze_ray', 'grapple']
    ],
    activeLoadout: 0,
    stats: {
        gamesPlayed: 0,
        wins: 0,
        knockouts: 0,
        damageDealt: 0,
        stomps: 0,
        highestCombo: 0
    },
    achievements: [],
    claimedSeasonRewards: [], // [NEW] Track claimed season pass levels
    isPro: false, // [NEW] PuckOff Pro Status
    proExpiry: null, // [NEW] Subscription expiry date
    lastProReward: 0, // [NEW] Timestamp of last weekly reward claim
    isLegacy: false, // [NEW] Legacy alpha/beta tester flag
    pucks: [], // [PHASE 3] Persistent Puck Instances
    lastLogin: null,
    createdAt: null
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [inventory, setInventory] = useState(DEFAULT_INVENTORY);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentWager, setCurrentWager] = useState(0); // [NEW] Wager State
    const [notifications, setNotifications] = useState([]); // [NEW] Notification state
    const migrationAttempted = React.useRef(false); // [PHASE 3] Prevent double migration

    const clearError = useCallback(() => setError(null), []);

    // Listen to auth state changes
    useEffect(() => {
        let mounted = true;

        // Safety timeout: If auth takes too long (e.g. 6s), force loading to false
        const safetyTimer = setTimeout(() => {
            if (mounted) {
                console.warn("Auth check timed out, forcing app load.");
                setLoading(false);
            }
        }, 6000);

        const checkAuthToken = async () => {
            const token = localStorage.getItem('pba_jwt_token');
            if (!token) {
                if (mounted) {
                    setUser(null);
                    setInventory(DEFAULT_INVENTORY);
                    setIsAdmin(false);
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
                return;
            }

            try {
                const res = await fetch(`${CONFIG.SERVER_URL}/api/auth/me`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (!mounted) return;

                if (res.ok && data.success) {
                    setUser(data.user);
                    setInventory({
                        ...DEFAULT_INVENTORY,
                        ...data.user
                    });
                    setIsAdmin(data.user.is_admin === 1);

                    // Setup real-time listeners over Socket.io
                    socket.auth = { token };
                    socket.connect();
                    socket.emit('registerPresence', { uid: data.user.uid, email: data.user.email });

                    const handleInventoryUpdate = (updates) => {
                        setInventory(prev => ({
                            ...prev,
                            ...updates
                        }));
                    };

                    const handleNotificationUpdate = (notifyList) => {
                        setNotifications(notifyList);
                    };

                    const handlePucksUpdate = (puckList) => {
                        setInventory(prev => ({
                            ...prev,
                            pucks: puckList
                        }));
                    };

                    socket.on('inventoryUpdate', handleInventoryUpdate);
                    socket.on('notificationUpdate', handleNotificationUpdate);
                    socket.on('pucksUpdate', handlePucksUpdate);

                    // Clean up socket listeners
                    return () => {
                        socket.off('inventoryUpdate', handleInventoryUpdate);
                        socket.off('notificationUpdate', handleNotificationUpdate);
                        socket.off('pucksUpdate', handlePucksUpdate);
                    };
                } else {
                    localStorage.removeItem('pba_jwt_token');
                    setUser(null);
                    setInventory(DEFAULT_INVENTORY);
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Auth start check error:", err);
                if (mounted) {
                    setError("Failed to load profile. Running in offline/guest mode.");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
            }
        };

        let cleanupSocket = null;
        checkAuthToken().then(cleanup => {
            cleanupSocket = cleanup;
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
            if (cleanupSocket) cleanupSocket();
        };
    }, []);

    // Load user data is now handled by real-time onSnapshot in useEffect

    // Save inventory to Firestore
    // Save inventory to SQLite via backend REST endpoint
    const saveInventory = useCallback(async (updates) => {
        if (!user) return;
        try {
            const token = localStorage.getItem('pba_jwt_token');
            const res = await fetch(`${CONFIG.SERVER_URL}/api/user/saveInventory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ updates })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save inventory');
            }
            // Updates will be merged locally
            setInventory(prev => ({ ...prev, ...updates }));
        } catch (error) {
            console.error('Error saving inventory:', error);
            setError("Failed to save changes. Your data may be out of sync.");
        }
    }, [user]);

    // ========== AUTH METHODS ==========

    async function loginWithGoogle() {
        console.warn("Google login is not supported on local SQLite database.");
        setError("Google Sign-In is currently disabled. Please use email and password.");
    }

    async function loginWithEmail(email, password) {
        try {
            setError(null);
            const res = await fetch(`${CONFIG.SERVER_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Login failed');
            }
            
            localStorage.setItem('pba_jwt_token', data.token);
            setUser(data.user);
            setInventory({
                ...DEFAULT_INVENTORY,
                ...data.user
            });
            setIsAdmin(data.user.is_admin === 1);
        } catch (error) {
            console.error('Email login error:', error);
            setError(error.message || "Login failed. Check your email and password.");
            throw error;
        }
    }

    async function signupWithEmail(email, password) {
        try {
            setError(null);
            const res = await fetch(`${CONFIG.SERVER_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, username: email.split('@')[0] })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Registration failed');
            }
            
            localStorage.setItem('pba_jwt_token', data.token);
            setUser(data.user);
            setInventory({
                ...DEFAULT_INVENTORY,
                ...data.user
            });
            setIsAdmin(false);
        } catch (error) {
            console.error('Signup error:', error);
            setError(error.message || "Failed to create account. Email might be in use.");
            throw error;
        }
    }

    async function logout() {
        try {
            setError(null);
            localStorage.removeItem('pba_jwt_token');
            socket.disconnect();
            setUser(null);
            setInventory(DEFAULT_INVENTORY);
            setIsAdmin(false);
        } catch (error) {
            console.error('Logout error:', error);
            setError("Logout failed.");
        }
    }

    // ========== ICON MANAGEMENT ==========

    const addIcons = useCallback(async (newIcons) => {
        if (!user) return;
        const uniqueIcons = [...new Set([...inventory.icons, ...newIcons])];
        await saveInventory({ icons: uniqueIcons });
        return uniqueIcons;
    }, [user, inventory.icons, saveInventory]);

    const equipIcon = useCallback(async (iconId) => {
        if (!user) return;
        await saveInventory({ equippedIcon: iconId });
    }, [user, saveInventory]);

    // [PHASE 3] Equip a specific Puck Instance
    const equipPuck = useCallback(async (puckId) => {
        if (!user) return;
        const puck = inventory.pucks.find(p => p.id === puckId);
        if (!puck) return;
        
        await saveInventory({ 
            equippedIcon: puck.iconId,
            equipped_puck_id: puckId // [NEW] Track the persistent ID
        });
        localStorage.setItem('equipped_puck_id', puckId);
        localStorage.setItem('equipped_skin', puck.iconId);
        localStorage.setItem('equipped_skin_tier', puck.tier);
    }, [user, inventory.pucks, saveInventory]);

    // ========== ECONOMY MANAGEMENT ==========

    const addZoins = useCallback(async (amount) => {
        if (!user) return;
        await saveInventory({ zoins: increment(amount) });
    }, [user, saveInventory]);

    const spendZoins = useCallback(async (amount) => {
        if (!user || (inventory.zoins || 0) < amount) return false;
        try {
            await saveInventory({ zoins: increment(-amount) });
            return true;
        } catch (error) {
            console.error('Error spending Zoins:', error);
            return false;
        }
    }, [user, inventory.zoins, saveInventory]);

    // [PHASE 3] Update specific Puck Stats via SQLite
    const updatePuckStats = useCallback(async (puckId, updates) => {
        if (!user) return;
        try {
            const token = localStorage.getItem('pba_jwt_token');
            const res = await fetch(`${CONFIG.SERVER_URL}/api/user/pucks/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ puckId, updates })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to update puck stats');
            }
            // Update local puck state
            setInventory(prev => ({
                ...prev,
                pucks: prev.pucks.map(p => p.id === puckId ? { ...p, ...updates } : p)
            }));
        } catch (error) {
            console.error('Error updating puck stats:', error);
        }
    }, [user]);

    const joinWagerMatch = useCallback(async (amount) => {
        if (!user || (inventory.zoins || 0) < amount) return false;
        // Deduct entry fee immediately (The "Ante")
        const success = await spendZoins(amount);
        if (success) {
            setCurrentWager(amount);
            return true;
        }
        return false;
    }, [user, inventory.zoins, spendZoins]);

    const applyPenalty = useCallback(async (penaltyType) => {
        if (!user) return;

        let updates = {};
        if (penaltyType === 'RAGE_QUIT') {
            const newConsecutive = (inventory.consecutiveQuits || 0) + 1;
            const penaltyAmount = -1; // -1 credit

            updates = {
                credits: increment(penaltyAmount),
                consecutiveQuits: increment(1)
            };

            // Apply ban if 0 credits or multiple quits
            if ((inventory.credits || 0) <= 0 || newConsecutive > 1) {
                const banMinutes = [1, 5, 30, 60, 1440][Math.min(newConsecutive - 1, 4)];
                const banUntil = new Date(Date.now() + banMinutes * 60000).toISOString();
                updates.banUntil = banUntil;
            }
        }

        try {
            await saveInventory(updates);
        } catch (error) {
            console.error('Error applying penalty:', error);
        }
    }, [user, inventory.credits, inventory.consecutiveQuits, saveInventory]);

    const useFreePack = useCallback(async () => {
        if (!user || inventory.freePacks < 1) return false;
        try {
            await saveInventory({ freePacks: increment(-1) });
            return true;
        } catch (error) {
            console.error('Error using free pack:', error);
            setError("Failed to open pack. Please try again.");
            return false;
        }
    }, [user, inventory.freePacks, saveInventory]);

    // ========== LOADOUT MANAGEMENT ==========

    const updateLoadout = useCallback(async (loadoutIndex, newLoadout) => {
        if (!user) return;
        const updatedLoadouts = [...inventory.loadouts];
        updatedLoadouts[loadoutIndex] = newLoadout;
        await saveInventory({ loadouts: updatedLoadouts });
    }, [user, inventory.loadouts, saveInventory]);

    const setActiveLoadout = useCallback(async (index) => {
        if (!user) return;
        await saveInventory({ activeLoadout: index });
    }, [user, saveInventory]);

    // ========== STATS MANAGEMENT ==========

    // Wrap updateMatchStats to include XP calculation & Wager Payout
    const updateMatchStats = useCallback(async (matchResult) => {
        if (!user) return;

        const { won, knockouts, damageDealt, stomps, maxCombo } = matchResult;

        // Calculate XP Rewards
        let xpEarned = 0;
        if (won) xpEarned += XP_WIN_BONUS;
        xpEarned += (knockouts || 0) * XP_KNOCKOUT;
        xpEarned += (stomps || 0) * XP_STOMP;

        try {
            // Psychological Rewards (Messy Numbers)
            const participationReward = 9;
            const winReward = won ? 53 : 0;
            const killReward = (knockouts || 0) * 7;

            // [NEW] Wager Payout Logic
            let wagerWinnings = 0;
            if (won && currentWager > 0) {
                // Winner takes 90% of pot (2x Ante)
                // e.g. 100 in -> 180 out.
                wagerWinnings = Math.floor(currentWager * 2 * 0.9);
            }

            const totalZoinsEarned = participationReward + winReward + killReward + wagerWinnings;

            // Perform single atomic update for Stats + Zoins + XP via SQLite
            await saveInventory({
                'stats.gamesPlayed': increment(1),
                'stats.wins': increment(won ? 1 : 0),
                'stats.knockouts': increment(knockouts || 0),
                'stats.damageDealt': increment(Math.floor(damageDealt || 0)),
                'stats.stomps': increment(stomps || 0),
                'stats.highestCombo': Math.max(inventory.stats.highestCombo, maxCombo || 0),
                zoins: increment(totalZoinsEarned),
                consecutiveQuits: 0,
                // Add XP atomically
                xp: increment(xpEarned)
            });

            // Reset Wager
            if (currentWager > 0) setCurrentWager(0);

            return { zoinsEarned: totalZoinsEarned, xpEarned, wagerWinnings };
        } catch (error) {
            console.error('Error updating match stats:', error);
            return null;
        }
    }, [user, inventory.stats.highestCombo, currentWager, saveInventory]);

    // ========== XP & PROGRESSION ==========

    const addXp = useCallback(async (amount) => {
        if (!user || amount <= 0) return;
        await saveInventory({ xp: increment(amount) });
    }, [user, saveInventory]);

    // Update time played every minute if user is active (simple implementation)
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(async () => {
            // We could check document.hidden here to only count active time
            if (document.hidden) return;

            try {
                // Add 1 minute to timePlayed and appropriate XP
                const xpAmount = 100; // 100 XP per minute
                await saveInventory({
                    timePlayed: increment(1),
                    xp: increment(xpAmount)
                });
            } catch (err) {
                console.error("Error updating playtime:", err);
            }
        }, 60000); // Every 60 seconds

        return () => clearInterval(interval);
    }, [user, saveInventory]);

    // ========== BAN MANAGEMENT ==========
    const removeBan = useCallback(async () => {
        if (!user || (inventory.zoins || 0) < 75) return false;
        try {
            await saveInventory({
                zoins: increment(-75),
                banUntil: null,
                consecutiveQuits: 0
            });
            return true;
        } catch (error) {
            console.error('Error removing ban:', error);
            return false;
        }
    }, [user, inventory.zoins, saveInventory]);

    // ========== ACHIEVEMENTS ==========

    const unlockAchievement = useCallback(async (achievementId) => {
        if (!user || inventory.achievements.includes(achievementId)) return false;
        try {
            await saveInventory({ achievements: arrayUnion(achievementId) });
            return true;
        } catch (error) {
            console.error('Error unlocking achievement:', error);
            return false;
        }
    }, [user, inventory.achievements, saveInventory]);

    // ========== SEASON PASS ==========

    const claimSeasonReward = useCallback(async (level, rewardType, amount) => {
        if (!user || inventory.claimedSeasonRewards?.includes(level)) return false;

        const updates = {
            claimedSeasonRewards: arrayUnion(level)
        };

        if (rewardType === 'zoin') {
            updates.zoins = increment(amount);
        } else if (rewardType === 'skin') {
            updates.skins = arrayUnion(amount);
        } // Add more reward types like 'icon' if needed

        try {
            await saveInventory(updates);
            return true;
        } catch (err) {
            console.error('Error claiming season reward:', err);
            return false;
        }
    }, [user, inventory.claimedSeasonRewards, saveInventory]);

    // ========== SOCIAL FUNCTIONS ==========

    const followUser = useCallback(async (targetUid) => {
        if (!user || user.uid === targetUid) return false;
        try {
            await saveInventory({ following: arrayUnion(targetUid) });
            return true;
        } catch (error) {
            console.error('Error following user:', error);
            return false;
        }
    }, [user, saveInventory]);

    const unfollowUser = useCallback(async (targetUid) => {
        if (!user) return false;
        try {
            await saveInventory({ following: arrayRemove(targetUid) });
            return true;
        } catch (error) {
            console.error('Error unfollowing user:', error);
            return false;
        }
    }, [user, saveInventory]);

    const fetchPublicProfile = useCallback(async (uid) => {
        if (!uid) return null;
        try {
            const res = await fetch(`${CONFIG.SERVER_URL}/api/user/profile/${uid}`);
            const data = await res.json();
            if (res.ok && data.success) {
                return data.profile;
            }
            return null;
        } catch (error) {
            console.error('Error fetching public profile:', error);
            return null;
        }
    }, []);

    // ========== NOTIFICATION MANAGEMENT ==========

    const sendNotification = useCallback(async (targetUid, type, data) => {
        if (!user) return false;
        try {
            const token = localStorage.getItem('pba_jwt_token');
            const res = await fetch(`${CONFIG.SERVER_URL}/api/user/notifications/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ targetUid, type, data })
            });
            const resData = await res.json();
            return res.ok && resData.success;
        } catch (error) {
            console.error('Error sending notification:', error);
            return false;
        }
    }, [user]);

    const markNotificationRead = useCallback(async (notificationId) => {
        if (!user) return;
        try {
            const token = localStorage.getItem('pba_jwt_token');
            await fetch(`${CONFIG.SERVER_URL}/api/user/notifications/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ notificationId })
            });
        } catch (error) {
            console.error('Error marking notification read:', error);
        }
    }, [user]);

    const deleteNotification = useCallback(async (notificationId) => {
        if (!user) return;
        try {
            const token = localStorage.getItem('pba_jwt_token');
            await fetch(`${CONFIG.SERVER_URL}/api/user/notifications/delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ notificationId })
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    }, [user]);

    const clearNotifications = useCallback(async () => {
        if (!user || notifications.length === 0) return;
        try {
            const token = localStorage.getItem('pba_jwt_token');
            await fetch(`${CONFIG.SERVER_URL}/api/user/notifications/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    }, [user, notifications]);

    // ========== ADMIN FUNCTIONS ==========

    const resetInventory = useCallback(async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem('pba_jwt_token');
            const res = await fetch(`${CONFIG.SERVER_URL}/api/user/resetInventory`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const resData = await res.json();
            if (res.ok && resData.success) {
                setInventory({
                    ...DEFAULT_INVENTORY,
                    email: user.email,
                    createdAt: inventory.createdAt
                });
            }
        } catch (error) {
            console.error('Error resetting inventory:', error);
        }
    }, [user, inventory.createdAt]);

    const resetIcons = useCallback(async () => {
        if (!user) return;
        await saveInventory({ icons: [], equippedIcon: null });
    }, [user, saveInventory]);

    const value = {
        user,
        loading,
        error,
        clearError,
        inventory,
        isAdmin,

        // Auth
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        updateUsername: (name) => saveInventory({ username: name }), // [NEW] Expose updateUsername

        // Icons
        addIcons,
        equipIcon,
        resetIcons,

        // Pucks
        equipPuck,
        updatePuckStats,

        // Economy
        addZoins,
        spendZoins,
        useFreePack,
        applyPenalty,
        removeBan,
        joinWagerMatch,

        // Loadouts
        updateLoadout,
        setActiveLoadout,

        // Stats
        updateMatchStats, // Used to be updateMatchStatsWithXp wrapper, now integrated
        unlockAchievement,

        // Progression
        addXp,
        claimSeasonReward,

        // Social
        followUser,
        unfollowUser,
        fetchPublicProfile,

        // Notifications
        notifications,
        sendNotification,
        markNotificationRead,
        deleteNotification,
        clearNotifications,

        // Admin
        resetInventory,
        saveInventory
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
