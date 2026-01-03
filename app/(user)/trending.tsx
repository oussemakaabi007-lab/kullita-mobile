import { useAudio } from "@/components/AudioProvider";
import SongCard from "@/components/SongCard";
import { useKeepFullScreen } from "@/hooks/useKeepFullScreen";
import { api } from "@/services/api";
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const Trending = () => {
    useKeepFullScreen();
    const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
    const { playSong, currentSong, upSongs } = useAudio();
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const initialFetchDone = useRef(false);
    const limit = 10;

    const fetchTrendingSongs = useCallback(async (currentOffset: number) => {
        if (loading || (!hasMore && currentOffset !== 0)) return;

        setLoading(true);
        try {
            const response = await api.get(`/songs/trending`, {
                params: { limit, offset: currentOffset }
            });
            
            const newSongs = response.data.items || [];
            
            if (newSongs.length < limit) {
                setHasMore(false);
            }

            setTrendingSongs(prev => {
                if (currentOffset === 0) return newSongs;
                const existingIds = new Set(prev.map(s => s.id));
                const filteredNew = newSongs.filter((s: any) => !existingIds.has(s.id));
                return [...prev, ...filteredNew];
            });
        } catch (err: any) {
            console.error("Trending Fetch Error:", err.message);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore]);

    useEffect(() => {
        if (!initialFetchDone.current) {
            fetchTrendingSongs(0);
            initialFetchDone.current = true;
        }
    }, []);

    const renderHeader = () => (
        <LinearGradient colors={['#2E79FF', '#0d254f', '#090b0f']} style={styles.header}>
            <View style={styles.coverArt}>
                <TrendingUp size={80} color="white" />
            </View>
            <View style={styles.headerInfo}>
                <Text style={styles.title}>TRENDING</Text>
                <Text style={styles.stats}>most played songs in the last week</Text>
            </View>
        </LinearGradient>
    );

    const renderFooter = () => {
        if (!loading && !hasMore) {
            return <Text style={styles.endMessage}>You've seen all the top hits!</Text>;
        }
        if (loading) {
            return (
                <View style={styles.footerLoader}>
                    <ActivityIndicator color="#2E79FF" />
                    <Text style={styles.footerText}>please wait...</Text>
                </View>
            );
        }
        return <View style={{ height: 100 }} />;
    };

    return (
        <SafeAreaView style={styles.appContainer}>
            <FlatList
                data={trendingSongs}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                onEndReached={() => fetchTrendingSongs(trendingSongs.length)}
                onEndReachedThreshold={0.5}
                renderItem={({ item }) => (
                    <SongCard
                        id={item.id}
                        title={item.title}
                        artist={item.artist}
                        cover={item.coverUrl}
                        isActive={currentSong?.id === item.id}
                        onClick={() => {
                            upSongs(trendingSongs);
                            playSong(item);
                        }}
                    />
                )}
            />
            <View style={{ height: 110 }} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    appContainer: {
        flex: 1,
        backgroundColor: '#090b0f',
    },
    header: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    coverArt: {
        width: 180,
        height: 180,
        backgroundColor: 'rgba(46, 121, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    headerInfo: {
        alignItems: 'center',
        marginTop: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 2,
    },
    stats: {
        fontSize: 14,
        color: '#ccc',
        marginTop: 5,
        textTransform: 'uppercase',
    },
    columnWrapper: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    footerLoader: {
        paddingVertical: 40,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    footerText: {
        color: '#ccc',
        fontSize: 14,
    },
    endMessage: {
        color: '#666',
        textAlign: 'center',
        paddingVertical: 40,
        fontSize: 14,
    }
});

export default Trending;