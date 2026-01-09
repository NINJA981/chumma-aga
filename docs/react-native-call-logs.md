# React Native Call Log Implementation Guide

## Overview
This guide covers implementing **Ghost-Sync** background call tracking and reading Android call logs in the VocalPulse mobile app.

---

## Prerequisites

```bash
# Initialize React Native project
npx react-native init VocalPulseMobile --template react-native-template-typescript

# Install required packages
npm install @react-native-async-storage/async-storage
npm install react-native-background-actions
npm install axios socket.io-client
```

---

## 1. Android Permissions

### android/app/src/main/AndroidManifest.xml
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Call Log Permissions -->
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    
    <!-- Background Service -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    
    <application ...>
        <!-- Broadcast Receiver for Call State -->
        <receiver
            android:name=".CallStateReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.PHONE_STATE" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
```

---

## 2. Native Module: CallLogReader

### android/app/src/main/java/.../CallLogModule.java
```java
package com.vocalpulsemobile;

import android.database.Cursor;
import android.provider.CallLog;
import com.facebook.react.bridge.*;
import java.util.Date;

public class CallLogModule extends ReactContextBaseJavaModule {
    
    public CallLogModule(ReactApplicationContext context) {
        super(context);
    }
    
    @Override
    public String getName() {
        return "CallLogReader";
    }
    
    @ReactMethod
    public void getRecentCalls(int limit, Promise promise) {
        try {
            WritableArray calls = Arguments.createArray();
            Cursor cursor = getReactApplicationContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                new String[]{
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DATE,
                    CallLog.Calls.DURATION
                },
                null, null,
                CallLog.Calls.DATE + " DESC LIMIT " + limit
            );
            
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    WritableMap call = Arguments.createMap();
                    call.putString("phoneNumber", cursor.getString(0));
                    call.putInt("type", cursor.getInt(1)); // 1=incoming, 2=outgoing, 3=missed
                    call.putDouble("timestamp", cursor.getLong(2));
                    call.putInt("duration", cursor.getInt(3));
                    calls.pushMap(call);
                }
                cursor.close();
            }
            
            promise.resolve(calls);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void getCallsSince(double timestamp, Promise promise) {
        try {
            WritableArray calls = Arguments.createArray();
            Cursor cursor = getReactApplicationContext().getContentResolver().query(
                CallLog.Calls.CONTENT_URI,
                new String[]{
                    CallLog.Calls.NUMBER,
                    CallLog.Calls.TYPE,
                    CallLog.Calls.DATE,
                    CallLog.Calls.DURATION
                },
                CallLog.Calls.DATE + " > ?",
                new String[]{String.valueOf((long) timestamp)},
                CallLog.Calls.DATE + " ASC"
            );
            
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    WritableMap call = Arguments.createMap();
                    call.putString("phoneNumber", cursor.getString(0));
                    call.putInt("type", cursor.getInt(1));
                    call.putDouble("timestamp", cursor.getLong(2));
                    call.putInt("duration", cursor.getInt(3));
                    calls.pushMap(call);
                }
                cursor.close();
            }
            
            promise.resolve(calls);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}
```

### Register the Module
```java
// CallLogPackage.java
public class CallLogPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext context) {
        return Arrays.asList(new CallLogModule(context));
    }
    // ...
}
```

---

## 3. TypeScript Interface

### src/native/CallLogReader.ts
```typescript
import { NativeModules } from 'react-native';

interface CallLogEntry {
  phoneNumber: string;
  type: 1 | 2 | 3; // 1=incoming, 2=outgoing, 3=missed
  timestamp: number;
  duration: number;
}

interface CallLogReaderInterface {
  getRecentCalls(limit: number): Promise<CallLogEntry[]>;
  getCallsSince(timestamp: number): Promise<CallLogEntry[]>;
}

export const CallLogReader = NativeModules.CallLogReader as CallLogReaderInterface;

export const CALL_TYPE = {
  INCOMING: 1,
  OUTGOING: 2,
  MISSED: 3,
} as const;
```

---

## 4. Ghost-Sync Background Service

### src/services/GhostSyncService.ts
```typescript
import BackgroundService from 'react-native-background-actions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CallLogReader, CALL_TYPE } from '../native/CallLogReader';
import { api } from './api';

const LAST_SYNC_KEY = '@vocalpulse_last_sync';
const SYNC_INTERVAL = 30000; // 30 seconds

const ghostSyncTask = async () => {
  while (BackgroundService.isRunning()) {
    try {
      // Get last sync timestamp
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      const lastSyncTime = lastSync ? parseInt(lastSync, 10) : Date.now() - 86400000; // 24h ago
      
      // Get new calls since last sync
      const newCalls = await CallLogReader.getCallsSince(lastSyncTime);
      
      for (const call of newCalls) {
        // Only sync outgoing calls to leads
        if (call.type === CALL_TYPE.OUTGOING) {
          const startedAt = new Date(call.timestamp).toISOString();
          const endedAt = new Date(call.timestamp + call.duration * 1000).toISOString();
          
          await api.post('/calls/ghost-sync', {
            phoneNumber: call.phoneNumber,
            startedAt,
            endedAt,
            durationSeconds: call.duration,
            callType: 'outbound',
          });
        }
      }
      
      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('Ghost sync error:', error);
    }
    
    // Wait before next sync
    await new Promise(resolve => setTimeout(resolve, SYNC_INTERVAL));
  }
};

export const GhostSyncService = {
  start: async () => {
    const options = {
      taskName: 'VocalPulse Sync',
      taskTitle: 'Call Tracking Active',
      taskDesc: 'Syncing your call activity',
      taskIcon: { name: 'ic_launcher', type: 'mipmap' },
      color: '#4f46e5',
      linkingURI: 'vocalpulse://',
    };
    
    await BackgroundService.start(ghostSyncTask, options);
  },
  
  stop: async () => {
    await BackgroundService.stop();
  },
  
  isRunning: () => BackgroundService.isRunning(),
};
```

---

## 5. Disposition Modal (Auto-trigger)

### src/hooks/useCallStateListener.ts
```typescript
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

type CallState = 'IDLE' | 'RINGING' | 'OFFHOOK';

export function useCallStateListener() {
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [lastCallInfo, setLastCallInfo] = useState<{
    phoneNumber: string;
    startTime: number;
  } | null>(null);
  
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'PhoneStateChange',
      (event: { state: CallState; phoneNumber?: string }) => {
        if (event.state === 'OFFHOOK' && event.phoneNumber) {
          // Call started
          setLastCallInfo({
            phoneNumber: event.phoneNumber,
            startTime: Date.now(),
          });
        } else if (event.state === 'IDLE' && lastCallInfo) {
          // Call ended - trigger disposition modal
          const duration = Math.round((Date.now() - lastCallInfo.startTime) / 1000);
          // Emit event for disposition modal
          DeviceEventEmitter.emit('ShowDispositionModal', {
            phoneNumber: lastCallInfo.phoneNumber,
            duration,
            startTime: lastCallInfo.startTime,
          });
          setLastCallInfo(null);
        }
        setCallState(event.state);
      }
    );
    
    return () => subscription.remove();
  }, [lastCallInfo]);
  
  return { callState, lastCallInfo };
}
```

### src/components/DispositionModal.tsx
```tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, DeviceEventEmitter } from 'react-native';
import { api } from '../services/api';

const DISPOSITIONS = [
  { value: 'connected', label: '✅ Connected', color: '#10b981' },
  { value: 'no_answer', label: '📵 No Answer', color: '#6b7280' },
  { value: 'voicemail', label: '📞 Voicemail', color: '#f59e0b' },
  { value: 'callback_scheduled', label: '📅 Callback', color: '#6366f1' },
  { value: 'converted', label: '🎉 Converted!', color: '#059669' },
  { value: 'not_interested', label: '❌ Not Interested', color: '#ef4444' },
];

export function DispositionModal() {
  const [visible, setVisible] = useState(false);
  const [callInfo, setCallInfo] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'ShowDispositionModal',
      (info) => {
        setCallInfo(info);
        setVisible(true);
      }
    );
    return () => subscription.remove();
  }, []);
  
  const handleDisposition = async (disposition: string) => {
    if (!callInfo) return;
    setSaving(true);
    
    try {
      await api.post('/calls', {
        phoneNumber: callInfo.phoneNumber,
        startedAt: new Date(callInfo.startTime).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: callInfo.duration,
        disposition,
        isAnswered: ['connected', 'converted', 'callback_scheduled'].includes(disposition),
        callSource: 'sim',
      });
      setVisible(false);
    } catch (error) {
      console.error('Failed to save disposition:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>
            How did the call go?
          </Text>
          <Text style={{ color: '#64748b', marginBottom: 20 }}>
            {callInfo?.phoneNumber} · {Math.floor(callInfo?.duration / 60)}m {callInfo?.duration % 60}s
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {DISPOSITIONS.map((d) => (
              <Pressable
                key={d.value}
                onPress={() => handleDisposition(d.value)}
                disabled={saving}
                style={{
                  backgroundColor: d.color + '20',
                  borderColor: d.color,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  minWidth: '45%',
                }}
              >
                <Text style={{ color: d.color, fontWeight: '600', textAlign: 'center' }}>
                  {d.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
```

---

## 6. Request Permissions

### src/utils/permissions.ts
```typescript
import { PermissionsAndroid, Platform } from 'react-native';

export async function requestCallLogPermissions(): Promise<boolean> {
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
    console.error('Permission request error:', error);
    return false;
  }
}
```

---

## Usage in App

```tsx
// App.tsx
import { useEffect } from 'react';
import { requestCallLogPermissions } from './utils/permissions';
import { GhostSyncService } from './services/GhostSyncService';
import { DispositionModal } from './components/DispositionModal';

export default function App() {
  useEffect(() => {
    const init = async () => {
      const hasPermission = await requestCallLogPermissions();
      if (hasPermission) {
        await GhostSyncService.start();
      }
    };
    init();
    
    return () => {
      GhostSyncService.stop();
    };
  }, []);
  
  return (
    <>
      {/* Your app content */}
      <DispositionModal />
    </>
  );
}
```

---

## Play Store Compliance

> ⚠️ **Important**: `READ_CALL_LOG` requires declaration in Play Console.

1. Go to **Policy > App content > Permissions declaration**
2. Declare usage: "VocalPulse requires call log access to automatically track sales calls and sync duration/timestamps to the manager dashboard without manual entry."
3. Provide a video demonstrating the core functionality
