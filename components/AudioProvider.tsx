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
    const playbackState = usePlaybackState();
    const { position, duration } = useProgress(200);
    const [show,setShow]=useState(false);
    const currentSong = useMemo(() => {
        return songs.find(s => s.id === activeTrackId) || EMPTY_SONG;
    }, [songs, activeTrackId]);
    const isPlaying = playbackState.state === State.Playing || playbackState.state === State.Buffering;

    useEffect(() => {
        const setup = async () => {
            if (isPlayerReady.current) return;
            try {
                await TrackPlayer.setupPlayer({
                    waitForBuffer: true,
                    autoHandleInterruptions: true
                });
                await TrackPlayer.updateOptions({
                    android: { 
                        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                    },
                    capabilities: [
                        Capability.Play, Capability.Pause,
                        Capability.SkipToNext, Capability.SkipToPrevious,
                        Capability.SeekTo,
                    ],
                    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious],
                });
                await TrackPlayer.setRepeatMode(RepeatMode.Queue);
                isPlayerReady.current = true;
            } catch (e) {
                isPlayerReady.current = true;
            }
        };
        setup();
    }, []);

    useTrackPlayerEvents([Event.PlaybackActiveTrackChanged, Event.PlaybackError], async (event) => {
        if (event.type === Event.PlaybackActiveTrackChanged && event.track) {
            const newId = Number(event.track.id);
            if (newId !== activeTrackId) setActiveTrackId(newId);
        }
    });
    const setshow=(show:boolean)=>{
        setShow(show);
    }
    const upSongs = async (list: Song[]) => {
        setSongs(list || []);
        if (isPlayerReady.current && list.length > 0) {
            try {
                const tracks = list.map(s => ({
                    id: s.id.toString(),
                    url: s.localUri || s.audioUrl,
                    title: s.title || "Track",
                    artist: s.artist || "Artist",
                    artwork: s.coverUrl ? s.coverUrl.replace('/upload/', '/upload/w_300,c_limit,q_auto:low/') : DEFAULT_ARTWORK,
                    pitchAlgorithm: PitchAlgorithm.Linear,
                    type: TrackType.Default
                }));
                await TrackPlayer.setQueue(tracks);
            } catch (e) {}
        }
    };

    const playSong = async (song: Song) => {
    if (!isPlayerReady.current || !song.audioUrl) return;
    setShow(true);
    try {
        const tracks = songs.map(s => ({
            id: s.id.toString(),
            url: s.localUri || s.audioUrl,
            title: s.title || "Track",
            artist: s.artist || "Artist",
            artwork: s.coverUrl ? s.coverUrl.replace('/upload/', '/upload/w_300,c_limit,q_auto:low/') : DEFAULT_ARTWORK,
            pitchAlgorithm: PitchAlgorithm.Linear,
            type: TrackType.Default
        }));

        const targetIndex = songs.findIndex(s => s.id === song.id);

        await TrackPlayer.setQueue(tracks)
        
        if (targetIndex !== -1) {
            await TrackPlayer.skip(targetIndex);
        }

        setActiveTrackId(song.id);

        await TrackPlayer.play();

        const forcePlay = setInterval(async () => {
            const state = await TrackPlayer.getPlaybackState();
            if (state.state === State.Playing) {
                clearInterval(forcePlay);
            } else {
                await TrackPlayer.play();
            }
        }, 250);

        setTimeout(() => clearInterval(forcePlay), 2000);

        api.post("/songs/add_playhistory", { songId: song.id }).catch(() => {});
    } catch (error) {}
};
    const contextValue = {
        playSong,
        setshow,
        upSongs,
        updateFavoriteStatus: (id: number, fav: boolean) => {
            setSongs(prev => prev.map(s => s.id === id ? { ...s, isFavorite: fav } : s));
        },
        currentSong,
        songs,
        isPlaying,
        togglePlayback: async () => {
            const state = await TrackPlayer.getPlaybackState();
            state.state === State.Playing ? await TrackPlayer.pause() : await TrackPlayer.play();
        },
        position,
        duration,
        seek: (pos: number) => TrackPlayer.seekTo(pos),
        downloadSong : async (song: Song) => {
            const urlToUse = song.audioUrl || songs.find(s => s.id === song.id)?.audioUrl;
            if (!urlToUse) return;
            try {
                const downloadDir = `${FileSystem.documentDirectory}downloads/`;
                const dirInfo = await FileSystem.getInfoAsync(downloadDir);
                if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });

                const fileUri = `${downloadDir}song_${song.id}.mp3`;
                const result = await FileSystem.downloadAsync(urlToUse, fileUri);
                
                if (result.status === 200) {
                    const savedUris = await AsyncStorage.getItem('downloaded_uris');
                    const parsedUris = savedUris ? JSON.parse(savedUris) : {};
                    parsedUris[song.id] = result.uri;
                    await AsyncStorage.setItem('downloaded_uris', JSON.stringify(parsedUris));
                    
                    const savedMeta = await AsyncStorage.getItem('downloaded_songs_metadata');
                    const parsedMeta = savedMeta ? JSON.parse(savedMeta) : [];
                    if (!parsedMeta.find((s: Song) => s.id === song.id)) {
                        parsedMeta.push(song);
                        await AsyncStorage.setItem('downloaded_songs_metadata', JSON.stringify(parsedMeta));
                    }
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
                    onNext={() => TrackPlayer.skipToNext()} 
                    onPrevious={() => TrackPlayer.skipToPrevious()} 
                    queue={songs} 
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