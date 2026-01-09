import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    Pressable,
    Alert,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GhostSyncService } from '../services/GhostSyncService';

export function HomeScreen({ onLogout }) {
    const [ghostSyncEnabled, setGhostSyncEnabled] = useState(false);
    const [syncCount, setSyncCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        checkGhostSyncStatus();
    }, []);

    const checkGhostSyncStatus = () => {
        setGhostSyncEnabled(GhostSyncService.isRunning());
    };

    const requestPermissions = async () => {
        if (Platform.OS !== 'android') return false;

        try {
            const granted = await PermissionsAndroid.requestMultiple([
                PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
                PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
            ]);

            return (
                granted['android.permission.READ_CALL_LOG'] === PermissionsAndroid.RESULTS.GRANTED &&
                granted['android.permission.READ_PHONE_STATE'] === PermissionsAndroid.RESULTS.GRANTED
            );
        } catch (error) {
            console.error('Permission error:', error);
            return false;
        }
    };

    const toggleGhostSync = async (value) => {
        if (value) {
            const hasPermission = await requestPermissions();
            if (!hasPermission) {
                Alert.alert(
                    'Permissions Required',
                    'Call log access is needed for automatic call sync.'
                );
                return;
            }

            await GhostSyncService.start();
        } else {
            await GhostSyncService.stop();
        }

        setGhostSyncEnabled(value);
    };

    const handleManualSync = async () => {
        setSyncing(true);
        try {
            const { synced, queued } = await GhostSyncService.syncNow();
            setSyncCount(synced + queued);
            let message = `Synced ${synced} calls`;
            if (queued > 0) message += ` (${queued} queued offline)`;
            Alert.alert('Sync Complete', message);
        } catch (error) {
            Alert.alert('Sync Failed', 'Could not sync calls. Please try again.');
        } finally {
            setSyncing(false);
        }
    };

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        await GhostSyncService.stop();
        onLogout();
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>VocalPulse</Text>
                <Text style={styles.headerSubtitle}>Sales rep mode</Text>
            </View>

            {/* Ghost Sync Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>🔮 Ghost-Sync</Text>
                    <Switch
                        value={ghostSyncEnabled}
                        onValueChange={toggleGhostSync}
                        trackColor={{ false: '#e2e8f0', true: '#a5b4fc' }}
                        thumbColor={ghostSyncEnabled ? '#4f46e5' : '#f4f4f5'}
                    />
                </View>
                <Text style={styles.cardDescription}>
                    Automatically sync your calls to the dashboard without opening the app.
                </Text>

                <View style={styles.statusRow}>
                    <View style={[styles.statusDot, ghostSyncEnabled ? styles.statusActive : styles.statusInactive]} />
                    <Text style={styles.statusText}>
                        {ghostSyncEnabled ? 'Active - Syncing in background' : 'Inactive'}
                    </Text>
                </View>
            </View>

            {/* Manual Sync */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>📲 Manual Sync</Text>
                <Text style={styles.cardDescription}>
                    Sync your recent calls now.
                </Text>
                <Pressable
                    style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
                    onPress={handleManualSync}
                    disabled={syncing}
                >
                    <Text style={styles.syncButtonText}>
                        {syncing ? 'Syncing...' : 'Sync Now'}
                    </Text>
                </Pressable>
                {syncCount > 0 && (
                    <Text style={styles.syncResult}>Last sync: {syncCount} calls</Text>
                )}
            </View>

            {/* Stats Card */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>--</Text>
                    <Text style={styles.statLabel}>Today's Calls</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>--</Text>
                    <Text style={styles.statLabel}>Talk Time</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>--</Text>
                    <Text style={styles.statLabel}>XP Today</Text>
                </View>
            </View>

            {/* Logout */}
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
        padding: 16,
    },
    header: {
        marginBottom: 24,
        marginTop: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#0f172a',
    },
    headerSubtitle: {
        fontSize: 15,
        color: '#64748b',
        marginTop: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0f172a',
    },
    cardDescription: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
        marginBottom: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    statusActive: {
        backgroundColor: '#10b981',
    },
    statusInactive: {
        backgroundColor: '#94a3b8',
    },
    statusText: {
        fontSize: 13,
        color: '#64748b',
    },
    syncButton: {
        backgroundColor: '#4f46e5',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
    },
    syncButtonDisabled: {
        opacity: 0.7,
    },
    syncButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    syncResult: {
        fontSize: 13,
        color: '#10b981',
        textAlign: 'center',
        marginTop: 12,
    },
    statsCard: {
        backgroundColor: '#4f46e5',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    statLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    logoutButton: {
        alignItems: 'center',
        padding: 16,
        marginTop: 8,
    },
    logoutText: {
        fontSize: 15,
        color: '#ef4444',
        fontWeight: '500',
    },
});
