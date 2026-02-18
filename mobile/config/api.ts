import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Auto-detects the backend API URL based on the platform.
 * - On Android emulator: uses 10.0.2.2 (maps to host localhost)
 * - On physical device / Expo Go: uses the Expo debugger host IP
 * - On web: uses localhost
 */
function getApiBaseUrl(): string {
    // Expo Go provides the debugger host which contains the dev machine's IP
    const debuggerHost = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;

    if (Platform.OS === 'web') {
        return 'http://localhost:8000';
    }

    if (debuggerHost) {
        // debuggerHost is something like "192.168.1.236:8081" — extract the IP
        const ip = debuggerHost.split(':')[0];
        return `http://${ip}:8000`;
    }

    // Fallback for Android emulator
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8000';
    }

    return 'http://localhost:8000';
}

export const API_BASE_URL = getApiBaseUrl();
