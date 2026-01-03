import PlaylistDetails from '@/components/PlaylistDetails';
import { useKeepFullScreen } from '@/hooks/useKeepFullScreen';
import { api } from "@/services/api";
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Download, Heart, History, ListMusic, Plus, X } from "lucide-react-native";
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function LibraryPage() {
    useKeepFullScreen();
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [selectedPlaylist, setSelectedPlaylist] = useState<{id: number, title: string} | null>(null);

    const fetchLibrary = async () => {
        try {
            const response = await api.get('/playlist/showAll');
            setPlaylists(response.data.playlists || []);
        } catch (err) {
            console.error("Library Fetch Error:", err);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchLibrary();
        }, [])
    );

    const handleCreatePlaylist = async () => {
        const trimmedName = newPlaylistName.trim();
        if (!trimmedName) {
            setError("Playlist name cannot be empty");
            return;
        }
        setIsCreating(true);
        try {
            const response = await api.post('/playlist/create', { name: trimmedName });
            if (response.status === 200 || response.status === 201) {
                setNewPlaylistName("");
                setIsCreateModalOpen(false);
                fetchLibrary();
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to create playlist");
        } finally {
            setIsCreating(false);
        }
    };

    if (selectedPlaylist) {
        return (
            <PlaylistDetails 
                playlistId={selectedPlaylist.id}
                initialTitle={selectedPlaylist.title}
                onBack={() => {
                    setSelectedPlaylist(null);
                    fetchLibrary();
                }}
            />
        );
    }

    if (isLoading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color="#2E79FF" size="large" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={playlists}
                keyExtractor={(item) => item.id.toString()}
                ListHeaderComponent={
                    <>
                        <View style={styles.header}>
                            <Text style={styles.title}>Your Library</Text>
                            <TouchableOpacity 
                                style={styles.addButton}
                                onPress={() => {
                                    setError(null);
                                    setNewPlaylistName("");
                                    setIsCreateModalOpen(true);
                                }}
                            >
                                <Plus color="#fff" size={24} />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={styles.playlistItem}
                            onPress={() => setSelectedPlaylist({ id: -1, title: "Liked Songs" })}
                        >
                            <LinearGradient colors={['#1d32b9ff', '#797ca2ff']} style={styles.likedCover}>
                                <Heart color="white" fill="white" size={24} />
                            </LinearGradient>
                            <View style={styles.playlistInfo}>
                                <Text style={styles.playlistName}>Liked Songs</Text>
                                <Text style={styles.playlistMeta}>Playlist • Auto-generated</Text>
                            </View>
                            <ChevronRight color="#444" size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.playlistItem}
                            onPress={() => setSelectedPlaylist({ id: -3, title: "Downloads" })}
                        >
                            <LinearGradient colors={['#004d40', '#009688']} style={styles.likedCover}>
                                <Download color="white" size={24} />
                            </LinearGradient>
                            <View style={styles.playlistInfo}>
                                <Text style={styles.playlistName}>Downloads</Text>
                                <Text style={styles.playlistMeta}>Playlist • Offline</Text>
                            </View>
                            <ChevronRight color="#444" size={20} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.playlistItem}
                            onPress={() => setSelectedPlaylist({ id: -2, title: "Recently Played" })}
                        >
                            <LinearGradient colors={['#1d32b9ff', '#797ca2ff']} style={styles.likedCover}>
                                <History color="white" size={24} />
                            </LinearGradient>
                            <View style={styles.playlistInfo}>
                                <Text style={styles.playlistName}>Recently Played</Text>
                                <Text style={styles.playlistMeta}>Playlist • History</Text>
                            </View>
                            <ChevronRight color="#444" size={20} />
                        </TouchableOpacity>
                    </>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.playlistItem}
                        onPress={() => setSelectedPlaylist({ id: item.id, title: item.name })}
                    >
                        <View style={styles.playlistCover}>
                            <ListMusic color="#888" size={30} />
                        </View>
                        <View style={styles.playlistInfo}>
                            <Text style={styles.playlistName}>{item.name}</Text>
                            <Text style={styles.playlistMeta}>Playlist • {item.songCount || 0} songs</Text>
                        </View>
                        <ChevronRight color="#444" size={20} />
                    </TouchableOpacity>
                )}
                contentContainerStyle={styles.listPadding}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={fetchLibrary} tintColor="#2E79FF" />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No playlists created yet.</Text>
                }
            />

            <Modal visible={isCreateModalOpen} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>New Playlist</Text>
                            {!isCreating && (
                                <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                                    <X color="#b3b3b3" size={24} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <TextInput 
                            style={[styles.input, error && { borderColor: '#ff4444', borderWidth: 1 }]}
                            placeholder="Playlist name"
                            placeholderTextColor="#666"
                            value={newPlaylistName}
                            editable={!isCreating}
                            onChangeText={(text) => {
                                setNewPlaylistName(text);
                                if (error) setError(null);
                            }}
                        />

                        {error && <Text style={styles.errorText}>{error}</Text>}

                        <View style={styles.modalButtons}>
                            {!isCreating && (
                                <TouchableOpacity onPress={() => setIsCreateModalOpen(false)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={[styles.confirmButton, isCreating && { opacity: 0.7 }]}
                                onPress={handleCreatePlaylist}
                                disabled={isCreating}
                            >
                                {isCreating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmText}>Create</Text>}
                            </TouchableOpacity>
                        </View>
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
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
    playlistItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    playlistCover: { width: 64, height: 64, backgroundColor: '#1a1a1a', borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
    likedCover: { width: 64, height: 64, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
    playlistInfo: { flex: 1, marginLeft: 15 },
    playlistName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    playlistMeta: { color: '#b3b3b3', fontSize: 13, marginTop: 4 },
    listPadding: { paddingBottom: 100 },
    emptyText: { color: '#666', textAlign: 'center', marginTop: 40 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { backgroundColor: '#1a1a1a', width: '85%', borderRadius: 16, padding: 20 },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    input: { backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 10 },
    errorText: { color: '#ff4444', fontSize: 13, marginBottom: 15 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, alignItems: 'center' },
    cancelText: { color: '#b3b3b3', fontSize: 16 },
    confirmButton: { backgroundColor: '#2E79FF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    confirmText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});