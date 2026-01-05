import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState({ icons: [], freePacks: 0, packCredits: 0 });
    const [isAdmin, setIsAdmin] = useState(false);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                await loadUserData(firebaseUser.uid);
            } else {
                setUser(null);
                setInventory({ icons: [], freePacks: 0, packCredits: 0 });
                setIsAdmin(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Load user data from Firestore
    async function loadUserData(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setInventory({
                    icons: data.icons || [],
                    freePacks: data.freePacks || 0,
                    packCredits: data.packCredits || 0
                });
                setIsAdmin(data.isAdmin || false);
            } else {
                // Create new user document
                await setDoc(doc(db, 'users', uid), {
                    email: auth.currentUser?.email,
                    icons: [],
                    freePacks: 0,
                    packCredits: 0,
                    createdAt: new Date().toISOString(),
                    isAdmin: false
                });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Save inventory to Firestore
    async function saveInventory(newInventory) {
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), newInventory);
            setInventory(prev => ({ ...prev, ...newInventory }));
        } catch (error) {
            console.error('Error saving inventory:', error);
        }
    }

    // Auth methods
    async function loginWithGoogle() {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    }

    async function loginWithEmail(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Email login error:', error);
            throw error;
        }
    }

    async function signupWithEmail(email, password) {
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    }

    async function logout() {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    // Add icons to inventory
    async function addIcons(newIcons) {
        const updatedIcons = [...new Set([...inventory.icons, ...newIcons])];
        await saveInventory({ icons: updatedIcons });
    }

    // Add pack credits (for earning through gameplay)
    async function addPackCredits(amount) {
        const newCredits = inventory.packCredits + amount;
        const earnedPacks = Math.floor(newCredits);
        const remainder = newCredits % 1;

        await saveInventory({
            packCredits: remainder,
            freePacks: inventory.freePacks + earnedPacks
        });

        return earnedPacks;
    }

    // Use a free pack
    async function consumeFreePack() {
        if (inventory.freePacks < 1) return false;
        await saveInventory({ freePacks: inventory.freePacks - 1 });
        return true;
    }

    // Reset icons (admin function)
    async function resetIcons() {
        await saveInventory({ icons: [], freePacks: 0, packCredits: 0 });
    }

    const value = {
        user,
        loading,
        inventory,
        isAdmin,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        addIcons,
        addPackCredits,
        consumeFreePack,
        resetIcons,
        saveInventory
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
