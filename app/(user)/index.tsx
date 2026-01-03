import { Song, useAudio } from '@/components/AudioProvider';
import PlaylistDetails from '@/components/PlaylistDetails';
import SongCard from '@/components/SongCard';
import { useKeepFullScreen } from '@/hooks/useKeepFullScreen';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CalendarDays, Heart } from 'lucide-react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../../services/api';
import { useAuth } from '../_layout';

export default function HomePage() {
  useKeepFullScreen();
  const router = useRouter();
  const { playSong, currentSong, upSongs } = useAudio();
  const { globalPlaylist, setGlobalPlaylist } = useAuth();
  const [localPlaylist, setLocalPlaylist] = useState<{ id: number; title: string } | null>(null);
  const [musicData, setMusicData] = useState<any[]>([]);
  // Start loading as false if we already know we are going to Downloads
  const [loading, setLoading] = useState(globalPlaylist?.id !== -3);
  const [refreshing, setRefreshing] = useState(false);

  const activePlaylist = globalPlaylist || localPlaylist;

  const fetchHomeContent = useCallback(async () => {
    if (globalPlaylist?.id === -3) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/songs/home');
      setMusicData(response.data);
    } catch (err: any) {
      console.error("Home API Error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [globalPlaylist?.id]);

  useEffect(() => {
    fetchHomeContent();
  }, [fetchHomeContent]);

  const formatGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  
  if (activePlaylist) {
    return (
      <PlaylistDetails
        playlistId={activePlaylist.id}
        initialTitle={activePlaylist.title}
        onBack={() => {
          setLocalPlaylist(null);
          setGlobalPlaylist(null);
        }}
      />
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2E79FF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentPadding}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchHomeContent();
          }}
          tintColor="#2E79FF"
        />
      }
    >
      <Text style={styles.greetingTitle}>{formatGreeting()}</Text>

      <View style={styles.greetingGrid}>
        <TouchableOpacity style={styles.greetingItem} onPress={() => setLocalPlaylist({ id: -1, title: 'Liked Songs' })}>
          <LinearGradient colors={['#2E79FF', '#1a3a8a']} style={styles.greetingImage}>
            <Heart color="white" size={32} fill="white" />
          </LinearGradient>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingItemTitle}>Liked Songs</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.greetingItem} onPress={() => router.push('/week')}>
          <LinearGradient colors={['#2E79FF', '#1a3a8a']} style={styles.greetingImage}>
            <CalendarDays color="white" size={32} />
          </LinearGradient>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingItemTitle}>Weekly Songs</Text>
          </View>
        </TouchableOpacity>
      </View>

      {musicData.map((section) => (
        <View key={section.id} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <TouchableOpacity onPress={() => {
              if (section.id === 'recent') setLocalPlaylist({ id: -2, title: 'History' });
              else if (section.id === 'week') router.push('/week');
              else if (section.id === 'trending') router.push('/trending');
            }}>
              <Text style={styles.showAllBtn}>SHOW ALL</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {section.items.map((item: any) => (
              <View key={item.id} style={styles.cardWrapper}>
                <SongCard
                  id={item.id}
                  title={item.title}
                  artist={item.artist}
                  cover={item.coverUrl}
                  isActive={currentSong?.id === item.id}
                  onClick={() => {
                    upSongs(section.items);
                    playSong(item);
                  }}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      ))}
      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090b0f' },
  contentPadding: { paddingHorizontal: 16, paddingTop: 50 },
  loaderContainer: { flex: 1, backgroundColor: '#090b0f', justifyContent: 'center', alignItems: 'center' },
  greetingTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 20 },
  greetingGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 32 },
  greetingItem: { width: '48.5%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1D23', height: 56, borderRadius: 8, marginBottom: 10, overflow: 'hidden', gap: 12 },
  greetingImage: { width: 56, height: 56, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  greetingTextContainer: { flex: 1 },
  greetingItemTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  sectionContainer: { marginBottom: 30 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  showAllBtn: { color: '#b3b3b3', fontSize: 11, fontWeight: '800' },
  horizontalScroll: { paddingRight: 16 },
  cardWrapper: { marginRight: 16 }
});