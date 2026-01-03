import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';
import { Eye, EyeOff, Lock, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, SafeAreaView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../_layout';
import { useKeepFullScreen } from '@/hooks/useKeepFullScreen';

export default function Login() {
    useKeepFullScreen();
    const router = useRouter();
    const { setUser } = useAuth();
    const [form, setForm] = useState({ username: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
        if (!form.username.trim() || !form.password.trim()) {
            setError("please type your password and username");
            return;
        }

        if (/^\s/.test(form.username)) {
            setError("Username cannot start with a space");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const res = await api.post('/auth/login', {
                username: form.username,
                password: form.password
            });

            const { access_token } = res.data.result;

            if (access_token) {
                api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;

                if (Platform.OS !== 'web') {
                    await SecureStore.setItemAsync('userToken', access_token);
                } else {
                    localStorage.setItem('userToken', access_token);
                }

                const decoded = jwtDecode(access_token);
                setUser(decoded);
            }
        } catch (err: any) {
            setError("Login failed. Check your username or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.pageWrapper}>
            {loading && (
                <View style={styles.miniLoader}>
                    <ActivityIndicator color="#0066ff" size="small" />
                    <Text style={styles.loaderText}>Logging in...</Text>
                </View>
            )}

            <View style={styles.loginContainer}>
                <Text style={styles.formTitle}>Login</Text>
                {error ? (
                    <View style={styles.errorMessage}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Username/email</Text>
                    <View style={styles.inputWrapper}>
                        <User size={18} color="#b3b3b3" style={styles.innerIcon} />
                        <TextInput
                            style={styles.inputField}
                            placeholder="Username or email"
                            placeholderTextColor="#777"
                            value={form.username}
                            onChangeText={(val) => {
                                setForm({ ...form, username: val });
                                if (error) setError("");
                            }}
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                        <Lock size={18} color="#b3b3b3" style={styles.innerIcon} />
                        <TextInput
                            style={styles.inputField}
                            placeholder="Password"
                            placeholderTextColor="#777"
                            secureTextEntry={!showPassword}
                            value={form.password}
                            onChangeText={(val) => {
                                setForm({ ...form, password: val });
                                if (error) setError("");
                            }}
                        />
                        <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={18} color="#b3b3b3" /> : < Eye size={18} color="#b3b3b3" />}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.forgotWrapper}>
                    <Link href="/forgotpassword" style={styles.forgotLink}>
                        Forgot your password?
                    </Link>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    <Text style={styles.submitBtnText}>
                        {loading ? "Connecting..." : "Log in"}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.divider}>or</Text>

                <Link href="/signup" style={styles.formLink}>
                    Don't have an account? <Text style={{ color: '#0066ff' }}>Sign up</Text>
                </Link>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    pageWrapper: {
        flex: 1,
        backgroundColor: '#090b0f',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 50 : 20,
    },
    loginContainer: {
        width: '100%',
        paddingHorizontal: 25,
        backgroundColor: 'transparent',
    },
    formTitle: {
        color: '#ffffff',
        fontSize: 32,
        fontWeight: '700',
        textAlign: 'left',
        marginBottom: 20,
    },
    errorMessage: {
        backgroundColor: 'rgba(255, 77, 77, 0.1)',
        padding: 12,
        borderRadius: 6,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 77, 77, 0.2)',
    },
    errorText: {
        color: '#ff4d4d',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    innerIcon: {
        marginLeft: 15,
    },
    inputField: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 12,
        color: '#ffffff',
        fontSize: 16,
    },
    eyeBtn: {
        paddingHorizontal: 15,
    },
    forgotWrapper: {
        alignItems: 'flex-end',
        marginBottom: 30,
    },
    forgotLink: {
        color: '#b3b3b3',
        fontSize: 13,
    },
    submitBtn: {
        backgroundColor: '#0059df',
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
    },
    submitBtnText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    divider: {
        textAlign: 'center',
        color: '#b3b3b3',
        fontSize: 13,
        marginVertical: 20,
    },
    formLink: {
        textAlign: 'center',
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
    },
    miniLoader: {
        position: 'absolute',
        top: 60,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(18, 18, 18, 0.95)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 99,
        zIndex: 1000,
    },
    loaderText: {
        color: '#0066ff',
        marginLeft: 10,
        fontWeight: '600',
    }
});