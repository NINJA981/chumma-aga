import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    Pressable,
    StyleSheet,
    RefreshControl,
    Linking,
} from 'react-native';
import { leadsApi } from '../services/api';

interface Lead {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    company: string;
    status: string;
    optimal_call_hour?: number;
    pickup_probability?: number;
}

export function LeadsScreen() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadLeads();
    }, []);

    const loadLeads = async () => {
        try {
            const response = await leadsApi.list({ limit: 50 });
            setLeads(response.data.leads);
        } catch (error) {
            console.error('Failed to load leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadLeads();
        setRefreshing(false);
    }, []);

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            new: '#3b82f6',
            contacted: '#f59e0b',
            qualified: '#8b5cf6',
            converted: '#10b981',
            lost: '#ef4444',
        };
        return colors[status] || '#6b7280';
    };

    const renderLead = ({ item }: { item: Lead }) => (
        <Pressable style={styles.leadCard} onPress={() => handleCall(item.phone)}>
            <View style={styles.leadHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {item.first_name?.[0]}{item.last_name?.[0]}
                    </Text>
                </View>
                <View style={styles.leadInfo}>
                    <Text style={styles.leadName}>
                        {item.first_name} {item.last_name}
                    </Text>
                    <Text style={styles.leadCompany}>{item.company || 'No company'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {item.status}
                    </Text>
                </View>
            </View>

            <View style={styles.leadFooter}>
                <Text style={styles.phoneText}>📞 {item.phone}</Text>
                {item.pickup_probability && (
                    <View style={styles.optimalTime}>
                        <Text style={styles.optimalTimeText}>
                            ⏰ Best: {item.optimal_call_hour}:00 ({item.pickup_probability}%)
                        </Text>
                    </View>
                )}
            </View>

            <Pressable style={styles.callButton} onPress={() => handleCall(item.phone)}>
                <Text style={styles.callButtonText}>📞 Call Now</Text>
            </Pressable>
        </Pressable>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading leads...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={leads}
                keyExtractor={(item) => item.id}
                renderItem={renderLead}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No leads assigned</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    list: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#64748b',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748b',
    },
    leadCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    leadHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4f46e5',
    },
    leadInfo: {
        flex: 1,
    },
    leadName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
    },
    leadCompany: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    leadFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    phoneText: {
        fontSize: 14,
        color: '#475569',
    },
    optimalTime: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    optimalTimeText: {
        fontSize: 12,
        color: '#15803d',
        fontWeight: '500',
    },
    callButton: {
        backgroundColor: '#4f46e5',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    callButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
});
