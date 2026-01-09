import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Pressable,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { aiApi } from '../services/api';

const { width } = Dimensions.get('window');

interface BattlecardOverlayProps {
    visible: boolean;
    objection: string;
    onDismiss: () => void;
}

export function BattlecardOverlay({
    visible,
    objection,
    onDismiss,
}: BattlecardOverlayProps) {
    const [rebuttal, setRebuttal] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const slideAnim = useState(new Animated.Value(width))[0];

    useEffect(() => {
        if (visible && objection) {
            fetchBattlecard();
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 9,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: width,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible, objection]);

    const fetchBattlecard = async () => {
        setLoading(true);
        try {
            const response = await aiApi.battlecard(objection);
            setRebuttal(response.data.battlecard.rebuttal);
        } catch (error) {
            console.error('Failed to get battlecard:', error);
            setRebuttal('Focus on the value your solution provides...');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateX: slideAnim }] },
            ]}
        >
            <View style={styles.header}>
                <Text style={styles.badge}>⚔️ BATTLECARD</Text>
                <Pressable onPress={onDismiss} style={styles.closeButton}>
                    <Text style={styles.closeText}>✕</Text>
                </Pressable>
            </View>

            <View style={styles.objectionBox}>
                <Text style={styles.objectionLabel}>Customer said:</Text>
                <Text style={styles.objectionText}>"{objection}"</Text>
            </View>

            <View style={styles.rebuttalBox}>
                <Text style={styles.rebuttalLabel}>💡 Suggested Response:</Text>
                {loading ? (
                    <Text style={styles.loadingText}>Generating rebuttal...</Text>
                ) : (
                    <Text style={styles.rebuttalText}>{rebuttal}</Text>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 16,
        width: width - 32,
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    badge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#f59e0b',
        letterSpacing: 1,
    },
    closeButton: {
        padding: 4,
    },
    closeText: {
        fontSize: 18,
        color: '#94a3b8',
    },
    objectionBox: {
        backgroundColor: '#ef444420',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    objectionLabel: {
        fontSize: 11,
        color: '#fca5a5',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    objectionText: {
        fontSize: 14,
        color: '#fecaca',
        fontStyle: 'italic',
    },
    rebuttalBox: {
        backgroundColor: '#10b98120',
        borderRadius: 8,
        padding: 12,
    },
    rebuttalLabel: {
        fontSize: 11,
        color: '#6ee7b7',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    rebuttalText: {
        fontSize: 15,
        color: '#d1fae5',
        lineHeight: 22,
    },
    loadingText: {
        fontSize: 14,
        color: '#6ee7b7',
        fontStyle: 'italic',
    },
});
