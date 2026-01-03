import { useAudio } from "@/components/AudioProvider";
import { api } from "@/services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import * as NavigationBar from 'expo-navigation-bar';
import { setStatusBarHidden } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system';
import { ChevronLeft, Download, Edit2, Heart, History, Info, MoreVertical, Play, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Animated,
    DeviceEventEmitter,
    FlatList, Image, Modal,
    Platform,
    SafeAreaView,
    StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

interface Props {
    playlistId: number;
    initialTitle: string;
    onBack: () => void;
}

export default function PlaylistDetails({ playlistId, initialTitle, onBack }: Props) {
    const { playSong, currentSong, upSongs, updateFavoriteStatus, songs } = useAudio();
    const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
    const [playlistTitle, setPlaylistTitle] = useState(initialTitle);
    const [Lsongs, setSongs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [newName, setNewName] = useState(initialTitle);
    const [editError, setEditError] = useState("");
    
    const toastOpacity = useRef(new Animated.Value(0)).current;
    const hideTimerRef = useRef<any>(null);
    const scrollY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('SONG_ADDED_TO_PLAYLIST', (data) => {
            if (String(data.playlistId) === String(playlistId)) {
                setSongs(prev => {
                    if (prev.find(s => s.id === data.song.id)) return prev;
                    return [data.song, ...prev];
                });
            }
        });
        return () => sub.remove();
    }, [playlistId]);

    useEffect(() => {
        if (Platform.OS === 'android') {
            NavigationBar.setVisibilityAsync('hidden');
            NavigationBar.setBehaviorAsync('inset-swipe');
            setStatusBarHidden(true, 'fade');
            const subscription = NavigationBar.addVisibilityListener(({ visibility }) => {
                if (visibility === 'visible') {
                    setStatusBarHidden(false, 'fade');
                    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                    hideTimerRef.current = setTimeout(() => {
                        NavigationBar.setVisibilityAsync('hidden');
                        setStatusBarHidden(true, 'fade');
                    }, 5000);
                }
            });
            return () => {
                subscription.remove();
                if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            };
        }
    }, []);

    const fetchPlaylistSongs = useCallback(async () => {
        try { 
            let response;
            let songList: any[] = [];

            if (playlistId === -3) {
                const savedMetadata = await AsyncStorage.getItem('downloaded_songs_metadata');
                const metadata = savedMetadata ? JSON.parse(savedMetadata) : [];
                
                const savedUris = await AsyncStorage.getItem('downloaded_uris');
                const uriMap = savedUris ? JSON.parse(savedUris) : {};

                songList = metadata.map((song: any) => ({
                    ...song,
                    localUri: uriMap[song.id] || null
                })).filter((song: any) => song.localUri !== null);
            } else {
                if (playlistId === -1) {
                    response = await api.get(`/favorite/fav`);
                } else if (playlistId === -2) {
                    response = await api.get(`/songs/recent?limit=50&offset=0`);
                } else {
                    response = await api.get(`/playlist/getsongs?playlistId=${playlistId}`);
                }
                songList = response.data.songs || response.data.items || [];
                
                const savedData = await AsyncStorage.getItem('downloaded_songs_metadata');
                if (savedData) {
                    const offlineSongs = JSON.parse(savedData);
                    songList = songList.map(s => {
                        const dl = offlineSongs.find((d: any) => d.id === s.id);
                        return dl ? { ...s, localUri: dl.localUri } : s;
                    });
                }

                if (response.data.name) {
                    setPlaylistTitle(response.data.name);
                    setNewName(response.data.name);
                }
            }
            setSongs(songList);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [playlistId]);

    useEffect(() => { fetchPlaylistSongs(); }, [fetchPlaylistSongs]);

    useEffect(() => {
        if (playlistId === -3) return;
        setSongs(prevSongs => {
            const updated = prevSongs.map(s => {
                const globalMatch = songs.find(gs => gs.id === s.id);
                return globalMatch ? { ...s, isFavorite: globalMatch.isFavorite } : s;
            });
            if (playlistId === -1) {
                const globalFavs = songs.filter(as => as.isFavorite);
                const stillFavs = updated.filter(u => u.isFavorite);
                const newItems = globalFavs.filter(gf => !stillFavs.find(u => u.id === gf.id));
                return [...newItems, ...stillFavs];
            }
            return updated;
        });
    }, [songs, playlistId]);

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
            setTimeout(() => {
                Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => 
                    setToast({ message: "", visible: false }));
            }, 2000);
        });
    };

    const handleRename = async () => {
        if (!newName.trim()) { setEditError("Name cannot be empty"); return; }
        setIsProcessing(true);
        try {
            await api.patch('/playlist/edit', { playlistId, newname: newName.trim() });
            setPlaylistTitle(newName.trim());
            setIsEditOpen(false);
            setIsMenuOpen(false);
        } catch (err) { console.error(err); } finally { setIsProcessing(false); }
    };

    const handleDeletePlaylist = async () => {
        setIsProcessing(true);
        try {
            await api.delete('/playlist/delete', { data: { playlistId } });
            setIsDeleteOpen(false);
            onBack();
        } catch (err) { console.error(err); } finally { setIsProcessing(false); }
    };

    const removeSongFromPlaylist = async (songId: number) => {
        setIsProcessing(true);
        try {
            if (playlistId === -3) {
                const songToDelete = Lsongs.find(s => s.id === songId);
                if (songToDelete?.localUri) {
                    await FileSystem.deleteAsync(songToDelete.localUri, { idempotent: true });
                }
                const updatedList = Lsongs.filter(s => s.id !== songId);
                await AsyncStorage.setItem('downloaded_songs_metadata', JSON.stringify(updatedList));
                setSongs(updatedList);
                showToast("Deleted from downloads");
            } else if (playlistId === -1) {
                await api.delete('/favorite/del', { data: { songId } });
                updateFavoriteStatus(songId, false);
                setSongs(prev => prev.filter(s => s.id !== songId));
            } else if (playlistId >= 0) {
                await api.delete('/playlist/removesong', { data: { playlistId, songId } });
                setSongs(prev => prev.filter(s => s.id !== songId));
            }
        } catch (err) { console.error(err); } finally { setIsProcessing(false); }
    };

    const toggleFav = async (song: any) => {
        const isCurrentlyFav = song.isFavorite;
        try {
            await api({
                method: isCurrentlyFav ? 'DELETE' : 'POST',
                url: isCurrentlyFav ? '/favorite/del' : '/favorite/add',
                data: { songId: song.id }
            });
            updateFavoriteStatus(song.id, !isCurrentlyFav);
            if (playlistId === -1 && isCurrentlyFav) {
                setSongs(prev => prev.filter(s => s.id !== song.id));
            }
            showToast(!isCurrentlyFav ? "Added to Favorites" : "Removed from Favorites");
        } catch (err) { console.error(err); }
    };

    const renderRightActions = (songId: number) => {
        if (playlistId === -2) return null;
        return (
            <TouchableOpacity style={styles.deleteAction} onPress={() => removeSongFromPlaylist(songId)}>
                <Trash2 color="white" size={24} />
            </TouchableOpacity>
        );
    };

    const backButtonY = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [50, 20],
        extrapolate: 'clamp'
    });

    if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#2E79FF" /></View>;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                {toast.visible && (
                    <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
                        <Info size={16} color="#fff" />
                        <Text style={styles.toastText}>{toast.message}</Text>
                    </Animated.View>
                )}

                <Animated.View style={[styles.backButtonWrapper, { top: backButtonY }]}>
                    <TouchableOpacity 
                        style={styles.backButtonContainer} 
                        onPress={onBack}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                        <View style={styles.backButtonCircle}>
                            <ChevronLeft color="white" size={32} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <FlatList
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: false }
                    )}
                    data={Lsongs}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    ListHeaderComponent={() => (
                        <LinearGradient colors={['#1e293b', '#090b0f']} style={styles.headerBackground}>
                            <View style={styles.coverContainer}>
                                <LinearGradient colors={playlistId === -3 ? ['#004d40', '#009688'] : ['#0e65fdff', '#071845ff']} style={styles.mainCover}>
                                    {playlistId === -1 ? (
                                        <Heart size={60} color="white" fill="white" />
                                    ) : playlistId === -2 ? (
                                        <History size={60} color="white" />
                                    ) : playlistId === -3 ? (
                                        <Download size={60} color="white" />
                                    ) : (
                                        <Text style={styles.coverLetter}>{playlistTitle.charAt(0).toUpperCase()}</Text>
                                    )}
                                </LinearGradient>
                            </View>
                            <View style={styles.infoSection}>
                                <Text style={styles.playlistTitle}>{playlistTitle}</Text>
                                <Text style={styles.playlistSubtitle}>{Lsongs.length} songs</Text>
                            </View>
                            <View style={styles.controlsRow}>
                                <TouchableOpacity style={styles.playButton} onPress={() => {
                                    if (Lsongs.length > 0) { upSongs(Lsongs); playSong(Lsongs[0]); }
                                }}>
                                    <Play size={24} fill="black" color="black" />
                                </TouchableOpacity>
                                {playlistId >= 0 && (
                                    <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
                                        <MoreVertical color="#b3b3b3" size={24} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </LinearGradient>
                    )}
                    renderItem={({ item }) => (
                        <Swipeable 
                            renderRightActions={() => renderRightActions(item.id)} 
                            renderLeftActions={() => renderRightActions(item.id)}
                            enabled={playlistId !== -2}
                        >
                            <View style={styles.songItemWrapper}>
                                <TouchableOpacity style={styles.songItem} onPress={() => { upSongs(Lsongs); playSong(item); }}>
                                    <View style={styles.songLeft}>
                                        <Image source={{ uri: item.localCoverUri || item.coverUrl }} style={styles.songCover} />
                                        <View style={styles.songText}>
                                            <Text style={[styles.songTitle, currentSong?.id === item.id && { color: '#2E79FF' }]} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.songArtist} numberOfLines={1}>{item.artist}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => toggleFav(item)} style={styles.heartButton}>
                                    <Heart size={22} color={item.isFavorite ? "#2E79FF" : "#666"} fill={item.isFavorite ? "#2E79FF" : "transparent"} />
                                </TouchableOpacity>
                            </View>
                        </Swipeable>
                    )}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={() => (
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ color: '#666' }}>No songs found</Text>
                        </View>
                    )}
                />

                <Modal visible={isProcessing || isMenuOpen || isEditOpen || isDeleteOpen} transparent animationType="fade">
                    <View style={styles.fullScreenOverlay}>
                        {isMenuOpen && (
                            <TouchableOpacity activeOpacity={1} style={styles.modalClickTarget} onPress={() => setIsMenuOpen(false)}>
                                <View style={styles.menuCard}>
                                    <TouchableOpacity style={styles.menuItem} onPress={() => { setIsEditOpen(true); setIsMenuOpen(false); }}>
                                        <Edit2 color="white" size={20} /><Text style={styles.menuText}>Rename Playlist</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.menuItem} onPress={() => { setIsDeleteOpen(true); setIsMenuOpen(false); }}>
                                        <Trash2 color="#ff4444" size={20} /><Text style={[styles.menuText, { color: '#ff4444' }]}>Delete Playlist</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        )}
                        {isEditOpen && (
                            <View style={styles.modalCard}>
                                <Text style={styles.modalHeader}>Rename Playlist</Text>
                                <TextInput style={[styles.input, editError ? {borderColor: '#ff4444', borderWidth: 1} : null]} value={newName} onChangeText={(t) => { setNewName(t); setEditError(""); }} />
                                {editError ? <Text style={styles.errorText}>{editError}</Text> : null}
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity onPress={() => setIsEditOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={handleRename}><Text style={styles.confirmText}>Save</Text></TouchableOpacity>
                                </View>
                            </View>
                        )}
                        {isDeleteOpen && (
                            <View style={styles.modalCard}>
                                <Text style={styles.modalHeader}>Delete Playlist?</Text>
                                <View style={styles.modalButtons}>
                                    <TouchableOpacity onPress={() => setIsDeleteOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                                    <TouchableOpacity onPress={handleDeletePlaylist}><Text style={[styles.confirmText, { color: '#ff4444' }]}>Delete</Text></TouchableOpacity>
                                </View>
                            </View>
                        )}
                        {isProcessing && <ActivityIndicator size="large" color="#2E79FF" />}
                    </View>
                </Modal>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#090b0f' },
    center: { flex: 1, backgroundColor: '#090b0f', justifyContent: 'center', alignItems: 'center' },
    headerBackground: { paddingTop: 80, paddingBottom: 20, alignItems: 'center' },
    coverContainer: { shadowColor: '#2E79FF', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, marginBottom: 10 },
    mainCover: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
    coverLetter: { color: 'white', fontSize: 60, fontWeight: 'bold' },
    infoSection: { marginTop: 15, alignItems: 'center' },
    playlistTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    playlistSubtitle: { color: '#b3b3b3' },
    controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 30, marginTop: 15 },
    playButton: { backgroundColor: '#2E79FF', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    songItemWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#090b0f' },
    songItem: { flex: 1 },
    songLeft: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    songCover: { width: 50, height: 50, borderRadius: 4, marginRight: 12 },
    songText: { flex: 1 },
    songTitle: { color: 'white', fontSize: 16 },
    songArtist: { color: '#b3b3b3', fontSize: 13 },
    heartButton: { padding: 15 },
    deleteAction: { backgroundColor: '#ff4444', justifyContent: 'center', alignItems: 'center', width: 80, height: '100%' },
    fullScreenOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
    modalClickTarget: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    menuCard: { backgroundColor: '#1a1a1a', width: '75%', borderRadius: 12, padding: 10 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 15 },
    menuText: { color: 'white', fontSize: 16, fontWeight: '500' },
    modalCard: { backgroundColor: '#1a1a1a', width: '85%', borderRadius: 15, padding: 25 },
    modalHeader: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: '#333', color: 'white', borderRadius: 8, padding: 12, marginBottom: 5 },
    errorText: { color: '#ff4444', fontSize: 12, marginBottom: 10 },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
    cancelText: { color: '#b3b3b3', fontSize: 16 },
    confirmText: { color: '#2E79FF', fontSize: 16, fontWeight: 'bold' },
    toastContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: '#2E79FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 25, gap: 8, zIndex: 1000 },
    toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    backButtonWrapper: { position: 'absolute', left: 15, zIndex: 100, width: 60, height: 60 },
    backButtonContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    backButtonCircle: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
});