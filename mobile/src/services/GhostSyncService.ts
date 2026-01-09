import BackgroundService from 'react-native-background-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';
import { callsApi } from './api';

const { CallLogReader } = NativeModules;

const LAST_SYNC_KEY = '@vocalpulse_last_sync';
const SYNC_INTERVAL = 30000; // 30 seconds

interface CallLogEntry {
    phoneNumber: string;
    type: number; // 1=incoming, 2=outgoing, 3=missed
    timestamp: number;
    duration: number;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ghost-Sync Background Task
 * Runs in background to sync call logs without user opening the app
 */
const ghostSyncTask = async () => {
    console.log('[GhostSync] Starting background task');

    while (BackgroundService.isRunning()) {
        try {
            // Get last sync timestamp
            const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
            const lastSyncTime = lastSyncStr
                ? parseInt(lastSyncStr, 10)
                : Date.now() - 86400000; // 24 hours ago

            // Get new calls since last sync
            const newCalls: CallLogEntry[] = await CallLogReader.getCallsSince(lastSyncTime);
            console.log(`[GhostSync] Found ${newCalls.length} new calls`);

            for (const call of newCalls) {
                // Only sync outgoing calls (type 2)
                if (call.type === 2 && call.duration > 0) {
                    const startedAt = new Date(call.timestamp).toISOString();
                    const endedAt = new Date(call.timestamp + call.duration * 1000).toISOString();

                    try {
                        await callsApi.ghostSync({
                            phoneNumber: call.phoneNumber,
                            startedAt,
                            endedAt,
                            durationSeconds: call.duration,
                            callType: 'outbound',
                        });
                        console.log(`[GhostSync] Synced call to ${call.phoneNumber}`);
                    } catch (error) {
                        console.error('[GhostSync] Failed to sync call:', error);
                    }
                }
            }

            // Update last sync timestamp
            await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

        } catch (error) {
            console.error('[GhostSync] Task error:', error);
        }

        // Wait before next sync
        await sleep(SYNC_INTERVAL);
    }
};

const backgroundOptions = {
    taskName: 'VocalPulse Sync',
    taskTitle: 'Call Tracking Active',
    taskDesc: 'Syncing your call activity in the background',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#4f46e5',
    linkingURI: 'vocalpulse://',
    parameters: {
        delay: 1000,
    },
};

export const GhostSyncService = {
    /**
     * Start the background sync service
     */
    start: async (): Promise<void> => {
        if (BackgroundService.isRunning()) {
            console.log('[GhostSync] Already running');
            return;
        }

        console.log('[GhostSync] Starting service...');
        await BackgroundService.start(ghostSyncTask, backgroundOptions);
        console.log('[GhostSync] Service started');
    },

    /**
     * Stop the background sync service
     */
    stop: async (): Promise<void> => {
        if (!BackgroundService.isRunning()) {
            console.log('[GhostSync] Not running');
            return;
        }

        console.log('[GhostSync] Stopping service...');
        await BackgroundService.stop();
        console.log('[GhostSync] Service stopped');
    },

    /**
     * Check if service is running
     */
    isRunning: (): boolean => {
        return BackgroundService.isRunning();
    },

    /**
     * Force sync now (manual trigger)
     */
    syncNow: async (): Promise<number> => {
        const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
        const lastSyncTime = lastSyncStr
            ? parseInt(lastSyncStr, 10)
            : Date.now() - 86400000;

        const newCalls: CallLogEntry[] = await CallLogReader.getCallsSince(lastSyncTime);
        let syncedCount = 0;

        for (const call of newCalls) {
            if (call.type === 2 && call.duration > 0) {
                try {
                    await callsApi.ghostSync({
                        phoneNumber: call.phoneNumber,
                        startedAt: new Date(call.timestamp).toISOString(),
                        endedAt: new Date(call.timestamp + call.duration * 1000).toISOString(),
                        durationSeconds: call.duration,
                        callType: 'outbound',
                    });
                    syncedCount++;
                } catch (error) {
                    console.error('[GhostSync] Sync error:', error);
                }
            }
        }

        await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        return syncedCount;
    },
};
