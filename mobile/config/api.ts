import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Auto-detects the backend API URL based on the platform.
 * - On Android emulator: uses 10.0.2.2 (maps to host localhost)
 * - On physical device / Expo Go: uses the Expo debugger host IP
 * - On web: uses localhost
 */
function getApiBaseUrl(): string {
    // Expo Go provides the hostUri which contains the dev machine's IP (e.g. "192.168.1.5:8081")
    const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.hostUri || '';

    if (Platform.OS === 'web') {
        return 'http://localhost:8000';
    }

    if (hostUri) {
        // Extract IP and use backend port 8000
        const ip = hostUri.split(':')[0];
        if (ip && ip !== 'localhost') {
            return `http://${ip}:8000`;
        }
    }

    // Fallback for Android emulator (standard android gateway)
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8000';
    }

    // Ultimate fallback
    return 'http://localhost:8000';
}

export const API_BASE_URL = getApiBaseUrl();
