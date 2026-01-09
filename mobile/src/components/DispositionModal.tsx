import React, { useEffect, useState } from 'react';
import {
    Modal,
    View,
    Text,
    Pressable,
    StyleSheet,
    DeviceEventEmitter,
    Dimensions,
} from 'react-native';
import { callsApi } from '../services/api';

const { width } = Dimensions.get('window');

interface CallInfo {
    phoneNumber: string;
    duration: number;
    startTime: number;
}

const DISPOSITIONS = [
    { value: 'connected', label: '✅ Connected', color: '#10b981' },
    { value: 'no_answer', label: '📵 No Answer', color: '#6b7280' },
    { value: 'voicemail', label: '📞 Voicemail', color: '#f59e0b' },
    { value: 'busy', label: '🔴 Busy', color: '#ef4444' },
    { value: 'callback_scheduled', label: '📅 Callback', color: '#6366f1' },
    { value: 'converted', label: '🎉 Converted!', color: '#059669' },
    { value: 'not_interested', label: '❌ Not Interested', color: '#dc2626' },
];

export function DispositionModal() {
    const [visible, setVisible] = useState(false);
    const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedDisposition, setSelectedDisposition] = useState<string | null>(null);

    useEffect(() => {
        // Listen for call end events
        const subscription = DeviceEventEmitter.addListener(
            'ShowDispositionModal',
            (info: CallInfo) => {
                setCallInfo(info);
                setSelectedDisposition(null);
                setVisible(true);
            }
        );

        return () => subscription.remove();
    }, []);

    const handleDisposition = async (disposition: string) => {
        if (!callInfo) return;

        setSelectedDisposition(disposition);
        setSaving(true);

        try {
            await callsApi.log({
                phoneNumber: callInfo.phoneNumber,
                startedAt: new Date(callInfo.startTime).toISOString(),
                endedAt: new Date().toISOString(),
                durationSeconds: callInfo.duration,
                disposition,
                isAnswered: ['connected', 'converted', 'callback_scheduled'].includes(disposition),
                callSource: 'sim',
                callType: 'outbound',
            });

            setVisible(false);
            setCallInfo(null);
        } catch (error) {
            console.error('Failed to save disposition:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSkip = () => {
        setVisible(false);
        setCallInfo(null);
    };

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleSkip}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>How did the call go?</Text>
                        <Text style={styles.subtitle}>
                            {callInfo?.phoneNumber} · {callInfo ? formatDuration(callInfo.duration) : ''}
                        </Text>
                    </View>

                    {/* Disposition Options */}
                    <View style={styles.grid}>
                        {DISPOSITIONS.map((d) => (
                            <Pressable
                                key={d.value}
                                onPress={() => handleDisposition(d.value)}
                                disabled={saving}
                                style={[
                                    styles.option,
                                    {
                                        backgroundColor: d.color + '15',
                                        borderColor: d.color,
                                        opacity: saving && selectedDisposition !== d.value ? 0.5 : 1,
                                    },
                                ]}
                            >
                                {saving && selectedDisposition === d.value ? (
                                    <Text style={[styles.optionText, { color: d.color }]}>
                                        Saving...
                                    </Text>
                                ) : (
                                    <Text style={[styles.optionText, { color: d.color }]}>
                                        {d.label}
                                    </Text>
                                )}
                            </Pressable>
                        ))}
                    </View>

                    {/* Skip Button */}
                    <Pressable onPress={handleSkip} style={styles.skipButton}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 15,
        color: '#64748b',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    option: {
        width: (width - 58) / 2,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '600',
    },
    skipButton: {
        marginTop: 20,
        alignItems: 'center',
        padding: 12,
    },
    skipText: {
        fontSize: 15,
        color: '#94a3b8',
    },
});
