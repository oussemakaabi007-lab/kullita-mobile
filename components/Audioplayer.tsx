import Slider from '@react-native-community/slider';
import * as NavigationBar from 'expo-navigation-bar';
import { ChevronDown, Download, Heart, Info, ListMusic, Music, Pause, Play, Plus, SkipBack, SkipForward, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, DeviceEventEmitter, Dimensions, Image, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { api } from '../services/api';
import { useAudio } from './AudioProvider';
import TrackPlayer, { Event, useTrackPlayerEvents } from 'react-native-track-player';

const { width } = Dimensions.get('screen');

export default function Audioplayer({show, currentSong, onNext, onPrevious, queue = [] }: any) {
    const [localTrack, setLocalTrack] = useState<any>(null);
    const { isPlaying, togglePlayback, updateFavoriteStatus, position, duration, seek, playSong, downloadSong, upSongs, songs } = useAudio();
    const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
    const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [downloadingSongId, setDownloadingSongId] = useState<number | null>(null);
    const [toast, setToast] = useState({ message: "", visible: false });
    const toastOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const sync = async () => {
            const active = await TrackPlayer.getActiveTrack();
            if (active) setLocalTrack({ id: Number(active.id), title: active.title, artist: active.artist, coverUrl: active.artwork, audioUrl: active.url });
        };
        sync();
    }, []);

    useEffect(() => {
        if (currentSong?.id !== -1) setLocalTrack(currentSong);
    }, [currentSong]);

    useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async (e) => {
        if (e.track) setLocalTrack({ id: Number(e.track.id), title: e.track.title, artist: e.track.artist, coverUrl: e.track.artwork, audioUrl: e.track.url });
    });

    const activeSong = songs.find((s: any) => s.id === localTrack?.id) || localTrack;

    useEffect(() => {
        if (Platform.OS === 'android') {
            const config = async () => {
                try {
                    await NavigationBar.setPositionAsync('absolute');
                    await NavigationBar.setBackgroundColorAsync('#00000000');
                    await NavigationBar.setVisibilityAsync('hidden');
                    await NavigationBar.setBehaviorAsync('overlay-swipe');
                } catch (e) {}
            };
            config();
        }
    }, []);

    const removeFromQueue = async (id: number) => {
        const idx = queue.findIndex((item: any) => item.id === id);
        if (idx !== -1) {
            await TrackPlayer.remove(idx);
            upSongs(queue.filter((item: any) => item.id !== id));
            showToast("Removed from queue");
        }
    };

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
            setTimeout(() => {
                Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToast({ message: "", visible: false }));
            }, 2000);
        });
    };

    const handleDownload = async () => {
        const isAlreadyDownloaded = activeSong.localUri || songs.find((s: any) => s.id === activeSong.id)?.localUri;
        if (isAlreadyDownloaded) return showToast("Available offline");
        
        setDownloadingSongId(activeSong.id);
        showToast("Downloading...");
        try { 
            await downloadSong(activeSong); 
            showToast("Complete"); 
        } catch (e) { 
            showToast("Failed:Song already downloaded or Error"); 
        } finally { 
            setDownloadingSongId(null); 
        }
    };

    const handleFavorite = async () => {
        setIsLoading(true);
        const isFav = activeSong.isFavorite;
        updateFavoriteStatus(activeSong.id, !isFav);
        try { await api({ method: isFav ? 'DELETE' : 'POST', url: isFav ? '/favorite/del' : '/favorite/add', data: { songId: activeSong.id } }); showToast(isFav ? "Removed" : "Added"); } catch (e) { updateFavoriteStatus(activeSong.id, isFav); } finally { setIsLoading(false); }
    };

    const fetchPlaylists = async () => {
        setIsLoading(true);
        try { const res = await api.get('/playlist/showAll'); setUserPlaylists(res.data.playlists || []); setIsPlaylistModalOpen(true); } catch (e) {} finally { setIsLoading(false); }
    };

    const handleCreatePlaylist = async () => {
        if (!newPlaylistName.trim()) return;
        setIsLoading(true);
        try { const res = await api.post('/playlist/create', { name: newPlaylistName }); await addToPlaylist(res.data.playlist.id, true); setNewPlaylistName(""); setIsCreating(false); } catch (e) {} finally { setIsLoading(false); }
    };

    const addToPlaylist = async (playlistId: number, silent = false) => {
        setIsLoading(true);
        try { await api.post('/playlist/addSong', { playlistId, songId: activeSong.id }); DeviceEventEmitter.emit('SONG_ADDED_TO_PLAYLIST', { playlistId, song: activeSong }); if (!silent) showToast("Added"); setIsPlaylistModalOpen(false); } catch (e) { showToast("Already exists"); } finally { setIsLoading(false); }
    };

    const formatTime = (s: number) => {
        if (!s || s < 0) return "0:00";
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (!activeSong || show===false) return null;

    return (
        <>
            <TouchableOpacity activeOpacity={0.9} onPress={() => setIsFullPlayerOpen(true)} style={styles.playerContainer}>
                {isLoading && <View style={styles.miniLoader}><ActivityIndicator color="#2E79FF" size="small" /></View>}
                <View style={styles.topSection}>
                    <View style={styles.songInfo}>
                        <Text style={styles.title} numberOfLines={1}>{activeSong.title}</Text>
                        <View style={styles.miniTimeRow}>
                            <Text style={styles.artist} numberOfLines={1}>{activeSong.artist}</Text>
                            <Text style={styles.miniTimeText}> • {formatTime(position)} / {formatTime(duration)}</Text>
                        </View>
                    </View>
                    <View style={styles.controls}>
                        <TouchableOpacity onPress={onPrevious}><SkipBack size={20} color="#fff" /></TouchableOpacity>
                        <TouchableOpacity onPress={handleDownload} disabled={downloadingSongId === activeSong.id}>
                            {downloadingSongId === activeSong.id ? <ActivityIndicator size="small" color="#2E79FF" /> : <Download size={20} color={activeSong.localUri ? "#2E79FF" : "#fff"} />}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>{isPlaying ? <Pause size={18} color="#000" fill="#000" /> : <Play size={18} color="#000" fill="#000" />}</TouchableOpacity>
                        <TouchableOpacity onPress={onNext}><SkipForward size={22} color="#fff" /></TouchableOpacity>
                    </View>
                </View>
                <View style={styles.progressBarSection}>
                    <Slider style={styles.slider} minimumValue={0} maximumValue={duration || 1} value={position} minimumTrackTintColor="#2E79FF" maximumTrackTintColor="#333" thumbTintColor="#2E79FF" onSlidingComplete={seek} />
                </View>
            </TouchableOpacity>

            <Modal visible={isFullPlayerOpen} animationType="slide" transparent={false} statusBarTranslucent>
                <View style={styles.fullScreenContainer}>
                    <View style={styles.fullHeader}>
                        <TouchableOpacity onPress={() => setIsFullPlayerOpen(false)}><ChevronDown size={30} color="#fff" /></TouchableOpacity>
                        <Text style={styles.fullHeaderTitle}>Now Playing</Text>
                        <TouchableOpacity onPress={fetchPlaylists}><Plus size={24} color="#fff" /></TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.fullScrollContent}>
                        <View style={styles.artContainer}><Image source={{ uri: activeSong.coverUrl }} style={styles.bigArt} /></View>
                        <View style={styles.fullMetaRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fullTitle}>{activeSong.title}</Text>
                                <Text style={styles.fullArtist}>{activeSong.artist}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 20 }}>
                                <TouchableOpacity onPress={handleDownload}><Download size={28} color={activeSong.localUri ? "#2E79FF" : "#fff"} /></TouchableOpacity>
                                <TouchableOpacity onPress={handleFavorite}><Heart size={28} color={activeSong.isFavorite ? "#2E79FF" : "#fff"} fill={activeSong.isFavorite ? "#2E79FF" : "transparent"} /></TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.fullProgressSection}>
                            <Slider style={{ width: '100%', height: 40 }} minimumValue={0} maximumValue={duration || 1} value={position} minimumTrackTintColor="#2E79FF" maximumTrackTintColor="#333" thumbTintColor="#fff" onSlidingComplete={seek} />
                            <View style={styles.timeRow}><Text style={styles.fullTimeText}>{formatTime(position)}</Text><Text style={styles.fullTimeText}>{formatTime(duration)}</Text></View>
                        </View>
                        <View style={styles.fullControlsRow}>
                            <TouchableOpacity onPress={onPrevious}><SkipBack size={35} color="#fff" fill="#fff" /></TouchableOpacity>
                            <TouchableOpacity onPress={togglePlayback} style={styles.fullPlayBtn}>{isPlaying ? <Pause size={40} color="#000" fill="#000" /> : <Play size={40} color="#000" fill="#000" />}</TouchableOpacity>
                            <TouchableOpacity onPress={onNext}><SkipForward size={35} color="#fff" fill="#fff" /></TouchableOpacity>
                        </View>
                        <View style={styles.queueHeader}><ListMusic size={20} color="#2E79FF" /><Text style={styles.queueTitle}>Queue</Text></View>
                        {queue.map((item: any) => (
                            <View key={item.id} style={[styles.queueItem, item.id === activeSong.id && styles.activeQueueItem]}>
                                <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 15 }} onPress={() => playSong(item, queue)}>
                                    <Image source={{ uri: item.coverUrl }} style={styles.queueArt} />
                                    <View style={{ flex: 1 }}><Text style={[styles.queueSongName, item.id === activeSong.id && { color: '#2E79FF' }]}>{item.title}</Text><Text style={styles.queueArtistName}>{item.artist}</Text></View>
                                </TouchableOpacity>
                                {item.id !== activeSong.id && <TouchableOpacity onPress={() => removeFromQueue(item.id)}><Trash2 size={18} color="#FF4D4D" /></TouchableOpacity>}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {toast.visible && <Animated.View style={[styles.toastContainer, { opacity: toastOpacity, bottom: isFullPlayerOpen ? 40 : 110 }]}><Info size={16} color="#fff" /><Text style={styles.toastText}>{toast.message}</Text></Animated.View>}

            <Modal visible={isPlaylistModalOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.modalCloser} onPress={() => setIsPlaylistModalOpen(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalIndicator} />
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{isCreating ? "New Playlist" : "Add to Playlist"}</Text><TouchableOpacity onPress={() => setIsPlaylistModalOpen(false)}><X size={24} color="#666" /></TouchableOpacity></View>
                        {isCreating ? (
                            <View style={styles.createContainer}><TextInput style={styles.input} placeholder="Name" placeholderTextColor="#666" value={newPlaylistName} onChangeText={setNewPlaylistName} /><View style={styles.createActionRow}><TouchableOpacity onPress={() => setIsCreating(false)}><Text style={{ color: '#8E8E93' }}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.confirmBtn} onPress={handleCreatePlaylist}><Text style={{ color: '#fff' }}>Create</Text></TouchableOpacity></View></View>
                        ) : (
                            <ScrollView><TouchableOpacity style={styles.createToggle} onPress={() => setIsCreating(true)}><View style={styles.createIconBox}><Plus size={24} color="#fff" /></View><Text style={{ color: '#fff' }}>New Playlist</Text></TouchableOpacity>{userPlaylists.map((pl: any) => (<TouchableOpacity key={pl.id} style={styles.playlistItem} onPress={() => addToPlaylist(pl.id)}><View style={styles.playlistIcon}><Music size={20} color="#fff" /></View><View><Text style={{ color: '#fff' }}>{pl.name}</Text><Text style={{ color: '#8E8E93' }}>{pl.songCount} songs</Text></View></TouchableOpacity>))}</ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    playerContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#0A0C10', borderTopWidth: 1, borderTopColor: '#1A1D23', paddingHorizontal: 15, paddingTop: 12, paddingBottom: Platform.OS === 'android' ? 24 : 34, zIndex: 100 },
    topSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    songInfo: { flex: 1 },
    title: { color: '#fff', fontSize: 14, fontWeight: '700' },
    artist: { color: '#8E8E93', fontSize: 11 },
    miniTimeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    miniTimeText: { color: '#555', fontSize: 11 },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    playButton: { backgroundColor: '#fff', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    progressBarSection: { flexDirection: 'row', alignItems: 'center', marginTop: -8 },
    slider: { flex: 1, height: 40 },
    miniLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5, 7, 10, 0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 150 },
    toastContainer: { position: 'absolute', left: 20, right: 20, backgroundColor: '#2E79FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 25, gap: 8, zIndex: 9999 },
    toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    fullScreenContainer: { flex: 1, backgroundColor: '#05070A' },
    fullHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, marginBottom: 20 },
    fullHeaderTitle: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    fullScrollContent: { paddingHorizontal: 25, paddingBottom: 100 },
    artContainer: { width: width - 50, height: width - 50, borderRadius: 20, overflow: 'hidden', marginBottom: 30, backgroundColor: '#111', alignSelf: 'center' },
    bigArt: { width: '100%', height: '100%' },
    fullMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    fullTitle: { color: '#fff', fontSize: 26, fontWeight: '800', flex: 1 },
    fullArtist: { color: '#2E79FF', fontSize: 18, marginTop: 4 },
    fullProgressSection: { marginBottom: 30 },
    timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -5 },
    fullTimeText: { color: '#8E8E93', fontSize: 12 },
    fullControlsRow: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', marginBottom: 40 },
    fullPlayBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, borderTopWidth: 1, borderTopColor: '#1A1D23', paddingTop: 20 },
    queueTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    queueItem: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 12 },
    activeQueueItem: { backgroundColor: 'rgba(46, 121, 255, 0.1)', borderRadius: 8, padding: 4 },
    queueArt: { width: 45, height: 45, borderRadius: 6 },
    queueSongName: { color: '#fff', fontSize: 14, fontWeight: '600' },
    queueArtistName: { color: '#8E8E93', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCloser: { flex: 1 },
    modalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 50, maxHeight: '85%' },
    modalIndicator: { width: 40, height: 5, backgroundColor: '#3A3A3C', borderRadius: 3, alignSelf: 'center', marginTop: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
    modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    createToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    createIconBox: { width: 50, height: 50, backgroundColor: '#2E79FF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    playlistItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    playlistIcon: { width: 50, height: 50, backgroundColor: '#2C2C2E', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    createContainer: { paddingVertical: 10 },
    input: { backgroundColor: '#2C2C2E', color: '#fff', padding: 15, borderRadius: 12, fontSize: 16, marginBottom: 20 },
    createActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
    confirmBtn: { backgroundColor: '#2E79FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }
});