import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from 'react-native';

import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { LeadsScreen } from './screens/LeadsScreen';
import { DispositionModal } from './components/DispositionModal';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ onLogout }) {
    return (
        <Tab.Navigator
            screenOptions={{
                tabBarActiveTintColor: '#4f46e5',
                tabBarInactiveTintColor: '#94a3b8',
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: '#e2e8f0',
                    paddingTop: 4,
                    paddingBottom: 8,
                    height: 60,
                },
                headerStyle: {
                    backgroundColor: '#fff',
                },
                headerTitleStyle: {
                    fontWeight: '600',
                    color: '#0f172a',
                },
            }}
        >
            <Tab.Screen
                name="Home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🏠</Text>,
                }}
            >
                {() => <HomeScreen onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen
                name="Leads"
                component={LeadsScreen}
                options={{
                    title: 'My Leads',
                    tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>👥</Text>,
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const token = await AsyncStorage.getItem('token');
        setIsAuthenticated(!!token);
    };

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
    };

    if (isAuthenticated === null) {
        return null; // Loading
    }

    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                    {!isAuthenticated ? (
                        <Stack.Screen name="Login">
                            {() => <LoginScreen onLoginSuccess={handleLoginSuccess} />}
                        </Stack.Screen>
                    ) : (
                        <Stack.Screen name="Main">
                            {() => <MainTabs onLogout={handleLogout} />}
                        </Stack.Screen>
                    )}
                </Stack.Navigator>
            </NavigationContainer>

            {/* Global Disposition Modal */}
            <DispositionModal />
        </SafeAreaProvider>
    );
}
