import { AudioProvider } from "@/components/AudioProvider";
import { api } from "@/services/api";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { jwtDecode } from "jwt-decode";
import { createContext, useContext, useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, View, Text, StyleSheet, Modal, TouchableOpacity, BackHandler } from "react-native";
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from "lucide-react-native";
import * as Linking from 'expo-linking';

const AuthContext = createContext<any>(null);
export function useAuth() { return useContext(AuthContext); }

const linking = {
    prefixes: [Linking.createURL('/'), 'kullita://'],
    config: {
        screens: {
            "(user)": {
                path: "",
                initialRouteName: "index",
                screens: {
                    index: "notification.click"
                }
            },
            "(public)": "public",
            "(artist)": "artist",
            "*": "" 
        },
    },
};

export default function RootLayout() {
    const [user, setUser] = useState<any>(null);
    const [initialized, setInitialized] = useState(false);
    const [isConnected, setIsConnected] = useState<boolean | null>(true);
    const [showOfflineModal, setShowOfflineModal] = useState(false);
    const [globalPlaylist, setGlobalPlaylist] = useState<any>(null);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        checkToken();
        const unsubscribeNet = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            setShowOfflineModal(state.isConnected === false && globalPlaylist?.id !== -3);
        });
        return () => unsubscribeNet();
    }, [globalPlaylist]);

    useEffect(() => {
        if (!initialized) return;
        const inAuthGroup = segments[0] === "(public)";
        const inUserGroup = segments[0] === "(user)";
        const inArtistGroup = segments[0] === "(artist)";

        if (!user) {
            if (!inAuthGroup) router.replace("/(public)/login");
        } else {
            if (user.role === "artist") {
                if (!inArtistGroup) router.replace("/(artist)/dashboard");
            } else if (user.role === "listener") {
                if (!inUserGroup) router.replace("/(user)");
            }
        }
    }, [user, segments, initialized]);

    async function checkToken() {
        try {
            const token = await SecureStore.getItemAsync("userToken");
            if (token) {
                const decoded: any = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    await SecureStore.deleteItemAsync("userToken");
                    setUser(null);
                } else {
                    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
                    setUser(decoded);
                }
            } else { setUser(null); }
        } catch (e) { setUser(null); } finally { setInitialized(true); }
    }

    const logout = async () => {
        try { await api.post("/auth/logout"); } catch (e) { }
        await SecureStore.deleteItemAsync("userToken");
        delete api.defaults.headers.common["Authorization"];
        setUser(null);
    };

    if (!initialized) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2E79FF" />
            </View>
        );
    }

    return (
        <AuthContext.Provider value={{ user, setUser, logout, globalPlaylist, setGlobalPlaylist }}>
            <AudioProvider>
                <SafeAreaProvider>
                    <Modal visible={showOfflineModal} transparent animationType="fade">
                        <View style={styles.offlineOverlay}>
                            <View style={styles.offlineCard}>
                                <WifiOff color="#2E79FF" size={48} />
                                <Text style={styles.offlineTitle}>No Connection</Text>
                                <Text style={styles.offlineText}>
                                    {user?.role === "listener" ? "You are offline. Listen to downloads." : "Check internet settings."}
                                </Text>
                                <TouchableOpacity 
                                    style={styles.button} 
                                    onPress={() => {
                                        if (user?.role === "listener") {
                                            setGlobalPlaylist({ id: -3, title: "Downloads" });
                                            setShowOfflineModal(false);
                                            router.push('/(user)');
                                        } else { BackHandler.exitApp(); }
                                    }}
                                >
                                    <Text style={styles.buttonText}>{user?.role === "listener" ? "Go to Downloads" : "Exit App"}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(public)" />
                        <Stack.Screen name="(user)" />
                        <Stack.Screen name="(artist)" />
                    </Stack>
                </SafeAreaProvider>
            </AudioProvider>
        </AuthContext.Provider>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    offlineOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    offlineCard: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 30, alignItems: 'center', width: '100%', maxWidth: 340 },
    offlineTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 15 },
    offlineText: { color: '#b3b3b3', textAlign: 'center', marginVertical: 15, fontSize: 15 },
    button: { backgroundColor: '#2E79FF', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10, width: '100%', alignItems: 'center' },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});