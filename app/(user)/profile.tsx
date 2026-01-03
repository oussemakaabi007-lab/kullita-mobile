import { useKeepFullScreen } from "@/hooks/useKeepFullScreen";
import { api } from "@/services/api";
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
    AlertTriangle,
    CheckCircle2,
    Lock,
    LogOut,
    Save,
    ShieldCheck,
    Trash2,
    X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { useAuth } from '../_layout';
import { useAudio } from "@/components/AudioProvider";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function ProfileScreen() {
    useKeepFullScreen();
    const router = useRouter();
    const { logout, setGlobalPlaylist } = useAuth();
  const { setshow } = useAudio();
    const [userInfo, setUserInfo] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [status, setStatus] = useState<{ type: 'error' | 'success' | null, msg: string }>({ type: null, msg: '' });
    
    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        try {
            const res = await api.get('/users/me');
            const data = res.data[0];
            const mappedUser = {
                id: String(data.id),
                name: data.name || data.username,
                email: data.email,
                role: data.role,
            };
            setUserInfo(mappedUser);
            setTempName(mappedUser.name);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUsername = async () => {
        if (!tempName.trim() || tempName.includes('@') || /^\s/.test(tempName)) {
            setStatus({ type: 'error', msg: 'Invalid username format' });
            return;
        }
        setProcessing(true);
        try {
            const res = await api.patch('/users/me', { userName: tempName });
            if (res.data.access_token) {
                await SecureStore.setItemAsync('userToken', res.data.access_token);
            }
            setUserInfo(prev => prev ? { ...prev, name: tempName } : null);
            setStatus({ type: 'success', msg: 'Username updated!' });
            setIsEditingName(false);
        } catch (err) {
            setStatus({ type: 'error', msg: 'Username is taken' });
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!passwords.current || !passwords.new || passwords.new !== passwords.confirm) {
            setStatus({ type: 'error', msg: 'Check your password entries' });
            return;
        }
        setProcessing(true);
        try {
            await api.patch('/users/updatePassword', {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });
            setStatus({ type: 'success', msg: 'Password updated successfully!' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            setStatus({ type: 'error', msg: 'Current password incorrect' });
        } finally {
            setProcessing(false);
        }
    };

    const handleLogout = async () => {
        try {
            await TrackPlayer.reset();
            setshow(false);
            await logout();
            router.replace("/(public)/login");
        } catch (e) {
            Alert.alert("Error", "Logout failed");
        }
    };

    const handleDeleteAccount = async () => {
        setProcessing(true);
        try {
            await api.delete('/users/me');
            await handleLogout();
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
            setIsDeleteModalOpen(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#0278d8" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Account Settings</Text>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <LogOut size={20} color="#ff4d4d" />
                    </TouchableOpacity>
                </View>

                {status.msg ? (
                    <View style={[styles.statusBox, status.type === 'error' ? styles.errorBox : styles.successBox]}>
                        {status.type === 'error' ? <AlertTriangle size={16} color="#ff4d4d" /> : <CheckCircle2 size={16} color="#1db954" />}
                        <Text style={[styles.statusText, { color: status.type === 'error' ? '#ff4d4d' : '#1db954' }]}>{status.msg}</Text>
                    </View>
                ) : null}

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ShieldCheck size={20} color="#0278d8" />
                        <Text style={styles.sectionTitle}>Basic Information</Text>
                    </View>
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>{userInfo?.role.toUpperCase()} NAME</Text>
                        {isEditingName ? (
                            <View style={styles.editRow}>
                                <TextInput style={styles.input} value={tempName} onChangeText={setTempName} autoFocus />
                                <TouchableOpacity style={styles.iconBtnSave} onPress={handleUpdateUsername}>
                                    <Save size={18} color="white" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtnCancel} onPress={() => {setIsEditingName(false); setTempName(userInfo?.name || '');}}>
                                    <X size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.displayRow}>
                                <Text style={styles.displayText}>{userInfo?.name}</Text>
                                <TouchableOpacity onPress={() => setIsEditingName(true)}>
                                    <Text style={styles.editText}>Change</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    <View style={styles.fieldContainer}>
                        <Text style={styles.label}>EMAIL ADDRESS</Text>
                        <Text style={styles.readOnlyText}>{userInfo?.email}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Lock size={20} color="#0278d8" />
                        <Text style={styles.sectionTitle}>Security</Text>
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Current Password</Text>
                        <TextInput style={styles.input} secureTextEntry placeholder="••••••••" placeholderTextColor="#666" value={passwords.current} onChangeText={(v) => setPasswords({...passwords, current: v})} />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>New Password</Text>
                        <TextInput style={styles.input} secureTextEntry value={passwords.new} onChangeText={(v) => setPasswords({...passwords, new: v})} />
                    </View>
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Confirm New Password</Text>
                        <TextInput style={styles.input} secureTextEntry value={passwords.confirm} onChangeText={(v) => setPasswords({...passwords, confirm: v})} />
                    </View>
                    <TouchableOpacity style={styles.primaryBtn} onPress={handleUpdatePassword} disabled={processing}>
                        {processing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.primaryBtnText}>Update Password</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.dangerZone}>
                    <View style={styles.dangerTextContainer}>
                        <Text style={styles.dangerTitle}>Delete Account</Text>
                        <Text style={styles.dangerSubtitle}>This action is permanent.</Text>
                    </View>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => setIsDeleteModalOpen(true)}>
                        <Trash2 size={18} color="white" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal visible={isDeleteModalOpen} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <AlertTriangle size={48} color="#ff4d4d" style={{ marginBottom: 15 }} />
                        <Text style={styles.modalTitle}>Delete Account?</Text>
                        <TouchableOpacity style={styles.confirmDeleteBtn} onPress={handleDeleteAccount}>
                            <Text style={styles.confirmDeleteBtnText}>Delete Permanently</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsDeleteModalOpen(false)}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <View style={{ height: 110 }} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090b0f' },
    center: { flex: 1, backgroundColor: '#090b0f', justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 20, paddingBottom: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 30 },
    headerTitle: { color: 'white', fontSize: 26, fontWeight: 'bold' },
    logoutBtn: { padding: 10, backgroundColor: 'rgba(255, 77, 77, 0.1)', borderRadius: 10 },
    statusBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 20, gap: 10 },
    errorBox: { backgroundColor: 'rgba(255, 77, 77, 0.05)', borderWidth: 1, borderColor: '#ff4d4d' },
    successBox: { backgroundColor: 'rgba(29, 185, 84, 0.05)', borderWidth: 1, borderColor: '#1db954' },
    statusText: { fontSize: 14, fontWeight: '500' },
    section: { backgroundColor: '#0e1117', borderRadius: 12, padding: 20, marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: '#282828', paddingBottom: 12, marginBottom: 20 },
    sectionTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
    fieldContainer: { marginBottom: 20 },
    label: { color: '#b3b3b3', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    displayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    displayText: { color: 'white', fontSize: 18, fontWeight: '600' },
    editText: { color: '#b3b3b3', textDecorationLine: 'underline' },
    readOnlyText: { color: '#fff', fontSize: 16 },
    editRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    input: { flex: 1, backgroundColor: '#282828', color: 'white', padding: 12, borderRadius: 8 },
    iconBtnSave: { backgroundColor: '#0062ffff', padding: 10, borderRadius: 8 },
    iconBtnCancel: { backgroundColor: '#444', padding: 10, borderRadius: 8 },
    formGroup: { marginBottom: 15 },
    primaryBtn: { backgroundColor: '#0278d8', padding: 15, borderRadius: 30, alignItems: 'center' },
    primaryBtnText: { color: 'white', fontWeight: 'bold' },
    dangerZone: { backgroundColor: '#1a0808', borderRadius: 12, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dangerTextContainer: { flex: 1 },
    dangerTitle: { color: '#ff4d4d', fontSize: 16, fontWeight: 'bold' },
    dangerSubtitle: { color: '#b3b3b3', fontSize: 12 },
    deleteBtn: { backgroundColor: '#ff4d4d', padding: 10, borderRadius: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: '#282828', width: '80%', padding: 25, borderRadius: 20, alignItems: 'center' },
    modalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
    confirmDeleteBtn: { backgroundColor: '#ff4d4d', width: '100%', padding: 15, borderRadius: 30, alignItems: 'center', marginBottom: 10 },
    confirmDeleteBtnText: { color: 'white', fontWeight: 'bold' },
    cancelBtn: { padding: 10 },
    cancelBtnText: { color: 'white' }
});