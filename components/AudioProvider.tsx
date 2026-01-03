import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from 'expo-file-system';
import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import TrackPlayer, { 
    Capability, State, Event, usePlaybackState, useProgress, useTrackPlayerEvents, AppKilledPlaybackBehavior, RepeatMode, PitchAlgorithm, TrackType
} from 'react-native-track-player';
import Audioplayer from "./Audioplayer";
import { api } from "../services/api";

export interface Song {
    id: number;
    title: string;
    audioUrl: string;
    coverUrl: string;
    artist: string;
    isFavorite: boolean;
    localUri?: string;
}

const AudioContext = createContext<any>(null);
const EMPTY_SONG: Song = { id: -1, title: "", audioUrl: "", coverUrl: "", artist: "", isFavorite: false };
const DEFAULT_ARTWORK = "https://res.cloudinary.com/dvimfakyh/image/upload/v1766903883/music_app/fjt9o3nzfho3faxrijbf.jpg";

export const AudioProvider = ({ children }: any) => {
    const [songs, setSongs] = useState<Song[]>([]);
    const [activeTrackId, setActiveTrackId] = useState<number>(-1);
    const isPlayerReady = useRef(false);
    const lastSkip = useRef(0);
    const playbackState = usePlaybackState();
    const { position, duration } = useProgress(200);
    const [show, setShow] = useState(false);

    const currentSong = useMemo(() => {
        return songs.find(s => s.id === activeTrackId) || EMPTY_SONG;
    }, [songs, activeTrackId]);

    const isPlaying = playbackState.state === State.Playing || playbackState.state === State.Buffering;

    useEffect(() => {
        const syncPlayer = async () => {
            try {
                const activeTrack = await TrackPlayer.getActiveTrack();
                if (activeTrack) {
                    const queue = await TrackPlayer.getQueue();
                    const formattedQueue = queue.map(t => ({
                        id: Number(t.id),
                        title: t.title || "",
                        artist: t.artist || "",
                        coverUrl: typeof t.artwork === 'string' ? t.artwork : DEFAULT_ARTWORK,
                        audioUrl: t.url as string,
                        isFavorite: false
                    }));
                    setSongs(formattedQueue);
                    setActiveTrackId(Number(activeTrack.id));
                    setShow(true);
                }
            } catch (e) {}
        };

        const setup = async () => {
            if (isPlayerReady.current) return;
            try {
                await TrackPlayer.setupPlayer({ waitForBuffer: true, autoHandleInterruptions: true });
                await TrackPlayer.updateOptions({
                    android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification },
                    capabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
                    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious],
                });
                await TrackPlayer.setRepeatMode(RepeatMode.Queue);
                isPlayerReady.current = true;
                await syncPlayer();
            } catch (e) {
                isPlayerReady.current = true;
                await syncPlayer();
            }
        };
        setup();
    }, []);

    useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async (event) => {
        if (event.type === Event.PlaybackActiveTrackChanged && event.track) {
            setActiveTrackId(Number(event.track.id));
            setShow(true);
        }
    });

    const upSongs = async (list: Song[]) => {
        if (!isPlayerReady.current || !list) return;
        const tracks = list.map(s => ({
            id: s.id.toString(),
            url: s.localUri || s.audioUrl,
            title: s.title,
            artist: s.artist,
            artwork: s.coverUrl?.replace('/upload/', '/upload/w_300,c_limit,q_auto:low/') || DEFAULT_ARTWORK,
            pitchAlgorithm: PitchAlgorithm.Linear,
            type: TrackType.Default
        }));
        await TrackPlayer.setQueue(tracks);
        setSongs(list);
    };

    const playSong = async (song: Song, newQueue?: Song[]) => {
        if (!isPlayerReady.current || !song.audioUrl) return;
        setShow(true);
        try {
            if (newQueue && newQueue.length > 0) {
                const tracks = newQueue.map(s => ({
                    id: s.id.toString(),
                    url: s.localUri || s.audioUrl,
                    title: s.title,
                    artist: s.artist,
                    artwork: s.coverUrl?.replace('/upload/', '/upload/w_300,c_limit,q_auto:low/') || DEFAULT_ARTWORK,
                }));
                await TrackPlayer.setQueue(tracks);
                setSongs(newQueue);
                const targetIdx = newQueue.findIndex(s => s.id === song.id);
                if (targetIdx !== -1) await TrackPlayer.skip(targetIdx);
            } else {
                const currentQueue = await TrackPlayer.getQueue();
                const targetIndex = currentQueue.findIndex(t => t.id === song.id.toString());
                if (targetIndex !== -1) {
                    await TrackPlayer.skip(targetIndex);
                } else {
                    const track = {
                        id: song.id.toString(),
                        url: song.localUri || song.audioUrl,
                        title: song.title,
                        artist: song.artist,
                        artwork: song.coverUrl || DEFAULT_ARTWORK,
                    };
                    await TrackPlayer.add([track]);
                    setSongs(prev => [...prev, song]);
                    const updatedQueue = await TrackPlayer.getQueue();
                    await TrackPlayer.skip(updatedQueue.length - 1);
                }
            }
            setActiveTrackId(song.id);
            await TrackPlayer.play();
            api.post("/songs/add_playhistory", { songId: song.id }).catch(() => {});
        } catch (error) {}
    };
    const resetPlayer = async () => {
    try {
        await TrackPlayer.reset();
        setActiveTrackId(-1);
        setSongs([]);
        setShow(false);
    } catch (e) {
        console.error(e);
    }
};
    const contextValue = {
        playSong,
        upSongs,
        setshow: (val: boolean) => setShow(val),
        updateFavoriteStatus: (id: number, fav: boolean) => {
            setSongs(prev => prev.map(s => s.id === id ? { ...s, isFavorite: fav } : s));
        },
        currentSong,
        songs,
        resetPlayer,
        isPlaying,
        togglePlayback: async () => {
            const state = await TrackPlayer.getPlaybackState();
            state.state === State.Playing ? await TrackPlayer.pause() : await TrackPlayer.play();
        },
        position,
        duration,
        seek: (pos: number) => TrackPlayer.seekTo(pos),
        downloadSong: async (song: Song) => {
            try {
                const downloadDir = `${FileSystem.documentDirectory}downloads/`;
                const dirInfo = await FileSystem.getInfoAsync(downloadDir);
                if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
                const fileUri = `${downloadDir}song_${song.id}.mp3`;
                const result = await FileSystem.downloadAsync(song.audioUrl, fileUri);
                if (result.status === 200) {
                    const savedMetadata = await AsyncStorage.getItem('downloaded_songs_metadata');
                    const metadata = savedMetadata ? JSON.parse(savedMetadata) : [];
                    if (!metadata.find((m: any) => m.id === song.id)) {
                        metadata.push({ id: song.id, title: song.title, artist: song.artist, coverUrl: song.coverUrl, audioUrl: song.audioUrl });
                        await AsyncStorage.setItem('downloaded_songs_metadata', JSON.stringify(metadata));
                    }
                    const savedUris = await AsyncStorage.getItem('downloaded_uris');
                    const uriMap = savedUris ? JSON.parse(savedUris) : {};
                    uriMap[song.id] = result.uri;
                    await AsyncStorage.setItem('downloaded_uris', JSON.stringify(uriMap));
                    setSongs(prev => prev.map(s => s.id === song.id ? { ...s, localUri: result.uri } : s));
                    return result.uri;
                }
            } catch (e) { throw e; }
        }
    };

    return (
        <AudioContext.Provider value={contextValue}>
            {children}
            {activeTrackId !== -1 && (
                <Audioplayer 
                    show={show}
                    currentSong={currentSong} 
                    onNext={() => {
                        const now = Date.now();
                        if (now - lastSkip.current > 1500) {
                            lastSkip.current = now;
                            TrackPlayer.skipToNext();
                        }
                    }} 
                    onPrevious={() => {
                        const now = Date.now();
                        if (now - lastSkip.current > 1500) {
                            lastSkip.current = now;
                            TrackPlayer.skipToPrevious();
                        }
                    }} 
                    duration={duration}
                    position={position}
                    isPlaying={isPlaying}
                    togglePlayback={contextValue.togglePlayback}
                />
            )}
        </AudioContext.Provider>
    );
};

export const useAudio = () => useContext(AudioContext);