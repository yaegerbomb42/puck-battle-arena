// Firebase Configuration for Puck Battle Arena
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase project config
// Your Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyAJKOZrYrRxuny9SKPSSaUGrJ4zqGDowYE",
    authDomain: "puck-70921.firebaseapp.com",
    projectId: "puck-70921",
    storageBucket: "puck-70921.firebasestorage.app",
    messagingSenderId: "1035604930002",
    appId: "1:1035604930002:web:bcb5c91284edabcdd32c0b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore Database - This IS your database for user purchases, icons, etc.
export const db = getFirestore(app);

export default app;
