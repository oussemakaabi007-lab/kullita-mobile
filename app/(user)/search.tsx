import { useAudio } from "@/components/AudioProvider";
import SongCard from "@/components/SongCard";
import { useKeepFullScreen } from "@/hooks/useKeepFullScreen";
import { api } from "@/services/api";
import { Music, Search as SearchIcon, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const LIMIT = 15;

export default function SearchPage() {
    useKeepFullScreen();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const { playSong, currentSong, upSongs } = useAudio();
    const isFetching = useRef(false);
    
    const handleSearch = useCallback(async (searchQuery: string, currentOffset: number) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setHasMore(false);
            return;
        }

        if (isFetching.current) return;
        isFetching.current = true;
        setIsLoading(true);

        try {
            const response = await api.get(`/songs/search`, {
                params: {
                    q: searchQuery,
                    limit: LIMIT,
                    offset: currentOffset
                }
            });

            const newSongs = response.data.songs || [];
            
            setHasMore(newSongs.length === LIMIT);

            setResults(prev => {
                if (currentOffset === 0) return newSongs;
                const existingIds = new Set(prev.map(s => s.id));
                const uniqueNewItems = newSongs.filter((s: any) => !existingIds.has(s.id));
                return [...prev, ...uniqueNewItems];
            });
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setIsLoading(false);
            isFetching.current = false;
        }
    }, []);
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setHasMore(true);
            handleSearch(query, 0);
        }, 350);

        return () => clearTimeout(timeoutId);
    }, [query, handleSearch]);

    const loadMore = () => {
        if (hasMore && !isLoading && results.length >= LIMIT) {
            handleSearch(query, results.length);
        }
    };

    const renderFooter = () => {
        if (isLoading) {
            return (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator color="#2E79FF" />
                    <Text style={styles.footerText}>Searching songs...</Text>
                </View>
            );
        }
        if (!hasMore && results.length > 0) {
            return <Text style={styles.endMessage}>No more results found.</Text>;
        }
        return <View style={{ height: 100 }} />;
    };

    return (
        <SafeAreaView style={styles.appContainer}>
            <View style={styles.header}>
                <View style={styles.searchBar}>
                    <SearchIcon color="#888" size={20} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search for songs or artists..."
                        placeholderTextColor="#666"
                        value={query}
                        onChangeText={setQuery}
                    />
                    {query !== "" && (
                        <TouchableOpacity onPress={() => setQuery("")}>
                            <X color="#888" size={20} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {results.length === 0 && !isLoading ? (
                <View style={styles.emptyState}>
                    <Music size={48} color="#444" />
                    <Text style={styles.stateText}>
                        {query ? `No songs found for "${query}"` : "Search for your favorite music"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={results}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    numColumns={2}
                    columnWrapperStyle={styles.columnWrapper}
                    contentContainerStyle={styles.listPadding}
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                    renderItem={({ item }) => (
                        <SongCard
                            id={item.id}
                            title={item.title}
                            artist={item.artist}
                            cover={item.coverUrl}
                            isActive={currentSong?.id === item.id}
                            onClick={() => {
                                upSongs(results);
                                playSong(item);
                            }}
                        />
                    )}
                />
            )}
            <View style={{ height: 110 }} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    appContainer: {
        flex: 1,
        backgroundColor: '#090b0f',
    },
    header: {
        padding: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 50,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    listPadding: {
        paddingBottom: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stateText: {
        color: '#666',
        marginTop: 15,
        fontSize: 16,
    },
    loaderContainer: {
        paddingVertical: 30,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    footerText: {
        color: '#2E79FF',
        marginLeft: 10,
        fontWeight: '500',
    },
    endMessage: {
        color: '#666',
        textAlign: 'center',
        paddingVertical: 30,
        fontSize: 14,
    }
});