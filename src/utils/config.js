/**
 * Central Configuration
 * Single source of truth for environment variables and game constants
 */

// Server URL - Prioritize Environment Variable, fallback to Render URL or localhost
const SERVER_URL = process.env.REACT_APP_SERVER_URL ||
    (process.env.NODE_ENV === 'production'
        ? 'https://api.puckoff.tech'
        : 'http://localhost:3002');

// Region Definitions
export const REGIONS = [
    { id: 'us-east', name: '🇺🇸 US East', url: SERVER_URL }, // Currently pointing to same for demo
    { id: 'eu-west', name: '🇪🇺 EU West', url: 'https://api-eu.puckoff.tech' },
    { id: 'asia', name: '🇯🇵 Tokyo', url: 'https://api-as.puckoff.tech' }
];

export const CONFIG = {
    SERVER_URL,
    REGIONS,

    // Connection Settings
    CONNECTION: {
        RECONNECTION_ATTEMPTS: 5,
        RECONNECTION_DELAY: 1000,
        TIMEOUT: 10000
    },

    // Game Client Settings
    CLIENT: {
        VERSION: '0.9.0',
        MAX_NAME_LENGTH: 16,
        DEBUG_MODE: process.env.NODE_ENV !== 'production'
    },

    // Storage Keys for Persistence
    STORAGE_KEYS: {
        PLAYER_ID: 'pba_player_id',
        ROOM_CODE: 'pba_room_code',
        PLAYER_NAME: 'pba_player_name',
        PLAYER_COLOR: 'pba_player_color'
    }
};

export default CONFIG;
