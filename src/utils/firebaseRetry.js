/**
 * Firebase operation retry utility
 * Retries failed operations with exponential backoff
 */

export async function withRetry(operation, maxAttempts = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // Don't retry auth errors (they're not network issues)
            if (error.code?.startsWith('auth/')) {
                throw error;
            }

            // Don't retry permission errors
            if (error.code === 'permission-denied') {
                throw error;
            }

            if (attempt < maxAttempts) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                console.warn(`Firebase operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * User-friendly error messages for Firebase error codes
 */
export function getFirebaseErrorMessage(error) {
    const code = error.code || '';

    const messages = {
        // Auth errors
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'Email is already registered.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/popup-closed-by-user': 'Login popup was closed. Please try again.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/too-many-requests': 'Too many attempts. Please wait and try again.',

        // Firestore errors
        'permission-denied': 'Access denied. Please log in again.',
        'unavailable': 'Service temporarily unavailable. Please try again.',
        'deadline-exceeded': 'Request timed out. Please try again.',
        'resource-exhausted': 'Too many requests. Please wait.',

        // Default
        'default': 'Something went wrong. Please try again.'
    };

    return messages[code] || messages['default'];
}
