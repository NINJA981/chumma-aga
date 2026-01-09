import BackgroundService from 'react-native-background-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { callsApi } from './api';

const { CallLogReader } = NativeModules;

const LAST_SYNC_KEY = '@vocalpulse_last_sync';
const QUEUE_KEY = '@vocalpulse_sync_queue';
const SYNC_INTERVAL = 30000; // 30 seconds

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Ghost-Sync Background Task
 * Runs in background to sync call logs without user opening the app
 */
const ghostSyncTask = async () => {
    console.log('[GhostSync] Starting background task');

    while (BackgroundService.isRunning()) {
        try {
            // 1. Process Offline Queue first
            await processQueue();

            // 2. Get last sync timestamp
            const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
            const lastSyncTime = lastSyncStr
                ? parseInt(lastSyncStr, 10)
                : Date.now() - 86400000; // 24 hours ago

            // 3. Get new calls since last sync
            let newCalls = [];
            try {
                if (Platform.OS === 'android') {
                    const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CALL_LOG);
                    if (hasPermission) {
                        newCalls = await CallLogReader.getCallsSince(lastSyncTime);
                    } else {
                        console.warn('[GhostSync] No READ_CALL_LOG permission');
                    }
                }
            } catch (e) {
                console.error('[GhostSync] Failed to read call logs:', e);
            }

            console.log(`[GhostSync] Found ${newCalls.length} new calls`);

            // 4. Sync new calls
            for (const call of newCalls) {
                // Only sync outgoing calls (type 2)
                if (call.type === 2 && call.duration > 0) {
                    const startedAt = new Date(call.timestamp).toISOString();
                    const endedAt = new Date(call.timestamp + call.duration * 1000).toISOString();

                    const callData = {
                        phoneNumber: call.phoneNumber,
                        startedAt,
                        endedAt,
                        durationSeconds: call.duration,
                        callType: 'outbound',
                    };

                    try {
                        await callsApi.ghostSync(callData);
                        console.log(`[GhostSync] Synced call to ${call.phoneNumber}`);
                    } catch (error) {
                        console.error('[GhostSync] Failed to sync call, queuing:', error);
                        await addToQueue(callData);
                    }
                }
            }

            // 5. Update last sync timestamp (always update to avoid re-reading same calls if queueing works)
            await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());

        } catch (error) {
            console.error('[GhostSync] Task error:', error);
        }

        // Wait before next sync
        await sleep(SYNC_INTERVAL);
    }
};

async function addToQueue(data) {
    try {
        const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
        const queue = queueStr ? JSON.parse(queueStr) : [];
        queue.push({
            id: Date.now().toString() + Math.random().toString(),
            data,
            retryCount: 0
        });
        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('[GhostSync] Queue save error:', e);
    }
}

async function processQueue() {
    try {
        const queueStr = await AsyncStorage.getItem(QUEUE_KEY);
        if (!queueStr) return;

        let queue = JSON.parse(queueStr);
        if (queue.length === 0) return;

        console.log(`[GhostSync] Processing ${queue.length} queued items`);
        const newQueue = [];

        for (const item of queue) {
            try {
                await callsApi.ghostSync(item.data);
                console.log(`[GhostSync] Processed queued item ${item.id}`);
            } catch (e) {
                console.error(`[GhostSync] Failed queued item ${item.id}`, e);
                item.retryCount++;
                if (item.retryCount < 5) { // Max retries
                    newQueue.push(item);
                }
            }
        }

        await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
    } catch (e) {
        console.error('[GhostSync] Queue process error:', e);
    }
}

const backgroundOptions = {
    taskName: 'VocalPulse Sync',
    taskTitle: 'VocalPulse Active',
    taskDesc: 'Syncing sales calls & refreshing leads...',
    taskIcon: {
        name: 'ic_launcher',
        type: 'mipmap',
    },
    color: '#4f46e5',
    linkingURI: 'vocalpulse://',
    parameters: {
        delay: 1000,
    },
    // Android specific for Foreground Service Notification
    progressBar: {
        max: 100,
        value: 0,
        indeterminate: true,
    }
};

export const GhostSyncService = {
    /**
     * Start the background sync service
     */
    start: async () => {
        if (BackgroundService.isRunning()) {
            console.log('[GhostSync] Already running');
            return true;
        }

        const hasPerm = await GhostSyncService.checkPermissions();
        if (!hasPerm) {
            console.warn('[GhostSync] Permission denied');
            return false;
        }

        console.log('[GhostSync] Starting service...');
        await BackgroundService.start(ghostSyncTask, backgroundOptions);
        console.log('[GhostSync] Service started');
        return true;
    },

    /**
     * Stop the background sync service
     */
    stop: async () => {
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
    isRunning: () => {
        return BackgroundService.isRunning();
    },

    /**
     * Check Android Permissions
     */
    checkPermissions: async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
                    {
                        title: 'Call Log Permission',
                        message: 'VocalPulse needs access to call logs to sync your sales calls.',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn('[GhostSync] Permission request failed', err);
                return false;
            }
        }
        return true;
    },

    /**
     * Force sync now (manual trigger)
     */
    syncNow: async () => {
        await processQueue(); // Process queue first

        const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
        const lastSyncTime = lastSyncStr
            ? parseInt(lastSyncStr, 10)
            : Date.now() - 86400000;

        let newCalls = [];
        if (Platform.OS === 'android') {
            try {
                newCalls = await CallLogReader.getCallsSince(lastSyncTime);
            } catch (e) { console.error(e); }
        }

        let syncedCount = 0;
        let queuedCount = 0;

        for (const call of newCalls) {
            if (call.type === 2 && call.duration > 0) {
                const callData = {
                    phoneNumber: call.phoneNumber,
                    startedAt: new Date(call.timestamp).toISOString(),
                    endedAt: new Date(call.timestamp + call.duration * 1000).toISOString(),
                    durationSeconds: call.duration,
                    callType: 'outbound',
                };
                try {
                    await callsApi.ghostSync(callData);
                    syncedCount++;
                } catch (error) {
                    console.error('[GhostSync] Sync error:', error);
                    await addToQueue(callData);
                    queuedCount++;
                }
            }
        }

        await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        return { synced: syncedCount, queued: queuedCount };
    },
};
