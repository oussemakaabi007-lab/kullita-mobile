import { useKeepFullScreen } from "@/hooks/useKeepFullScreen";
import { api } from "@/services/api";
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
  Music,
  PlayCircle,
  PlusCircle,
  TrendingUp,
  Upload,
  Users,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

function formatGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function ArtistDashboard() {
  useKeepFullScreen();
  const [stats, setStats] = useState({ totalListeners: 0, totalPlays: 0 });
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [growth, setGrowth] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchArtistData = async () => {
    try {
      const [statsRes, growthRes] = await Promise.all([
        api.get('/users/stats'),
        api.get('/users/growth')
      ]);

      setGrowth(growthRes.data.growth || 0);
      setStats({ 
        totalListeners: statsRes.data.stats.totalListeners, 
        totalPlays: statsRes.data.stats.totalPlays 
      });
      setTopSongs(statsRes.data.topTracks || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtistData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.appContainer, styles.centered]}>
        <ActivityIndicator size="large" color="#0066ff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.appContainer}>
      <ScrollView contentContainerStyle={styles.contentPadding}>
        <View style={styles.dashHeader}>
          <Text style={styles.greetingTitle}>{formatGreeting()}</Text>
          <Text style={styles.subtitle}>Here is what's happening with your music today.</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon={<Users color="#0066ff" size={24} />} label="Total Listeners" value={stats.totalListeners.toLocaleString()} />
          <StatCard icon={<PlayCircle color="#0066ff" size={24} />} label="Total Streams" value={stats.totalPlays.toLocaleString()} />
          <StatCard icon={<TrendingUp color="#0066ff" size={24} />} label="Growth" value={`${growth}%`} />
        </View>

        <View style={styles.sectionSpace}>
          <Text style={styles.sectionTitle}>Your Top 3 Tracks</Text>
          {topSongs.length === 0 ? (
            <Text style={styles.emptyText}>You don't have any songs yet.</Text>
          ) : (
            <View style={styles.topTracksContainer}>
              {topSongs.map((song, index) => (
                <View key={song.id || index} style={styles.bestTrackCard}>
                  <Text style={styles.rankNumber}>#{index + 1}</Text>
                  <Image source={{ uri: song.coverUrl }} style={styles.bestSongImage} />
                  <View style={styles.bestSongInfo}>
                    <Text style={styles.bestSongTitle} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.playCountText}>{song.listenCount?.toLocaleString()} Plays</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionSpace}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionCard} onPress={() => setIsModalOpen(true)}>
            <PlusCircle size={28} color="#0066ff" />
            <Text style={styles.actionText}>Upload New Track</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <UploadModal 
        visible={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchArtistData} 
      />
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <View style={styles.statCard}>
      {icon}
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function UploadModal({ visible, onClose, onSuccess }: any) {
  const [title, setTitle] = useState("");
  const [audio, setAudio] = useState<any>(null);
  const [cover, setCover] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setTitle("");
      setAudio(null);
      setCover(null);
      setError(null);
    }
  }, [visible]);

  const pickAudio = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (!result.canceled) {
      setAudio(result.assets[0]);
      setError(null);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1 
    });
    if (!result.canceled) {
      setCover(result.assets[0]);
      setError(null);
    }
  };

  const handlePublish = async () => {
    setError(null);

    if (!title.trim()) {
      setError("Please enter a song title.");
      return;
    }
    if (!audio) {
      setError("Please select an audio file.");
      return;
    }
    if (!cover) {
      setError("Please select a cover image.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    
    formData.append('audio', {
      uri: audio.uri,
      name: audio.name || 'upload.mp3',
      type: audio.mimeType || 'audio/mpeg',
    } as any);

    formData.append('cover', {
      uri: cover.uri,
      name: 'cover.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      await api.post('/songs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError("Failed to upload. Please try again.");
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload New Song</Text>
            <TouchableOpacity onPress={onClose} disabled={uploading}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          <TextInput 
            style={styles.input} 
            placeholder="Song Title" 
            placeholderTextColor="#b3b3b3"
            value={title}
            onChangeText={(t) => { setTitle(t); if(error) setError(null); }}
            editable={!uploading}
          />

          <View style={styles.fileRow}>
            <TouchableOpacity 
              style={[styles.customUploadBox, audio && { borderColor: '#0066ff' }]} 
              onPress={pickAudio}
              disabled={uploading}
            >
              <Music size={24} color={audio ? "#0066ff" : "#555"} />
              <Text style={[styles.uploadBoxText, audio && { color: '#fff' }]} numberOfLines={1}>
                {audio ? audio.name : "Select Audio"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.customUploadBox, cover && { borderColor: '#0066ff' }]} 
              onPress={pickImage}
              disabled={uploading}
            >
              <Upload size={24} color={cover ? "#0066ff" : "#555"} />
              <Text style={[styles.uploadBoxText, cover && { color: '#fff' }]} numberOfLines={1}>
                {cover ? "Cover Selected" : "Select Cover"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelBtn} 
              onPress={onClose} 
              disabled={uploading}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitBtn, uploading && { opacity: 0.7 }]} 
              onPress={handlePublish} 
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#090b0f' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  contentPadding: { padding: 20, paddingBottom: 100 },
  dashHeader: { marginBottom: 30 },
  greetingTitle: { color: '#fff', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#b3b3b3', fontSize: 14, marginTop: 5 },
  statsGrid: { gap: 15 },
  statCard: { 
    backgroundColor: '#010c1d', 
    padding: 20, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#1c3461' 
  },
  statLabel: { color: '#b3b3b3', fontSize: 12 },
  statValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  sectionSpace: { marginTop: 35 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 15 },
  topTracksContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  bestTrackCard: { 
    width: (width - 60) / 2, 
    backgroundColor: '#010c1d', 
    borderRadius: 15, 
    padding: 10, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#0066ff'
  },
  rankNumber: { color: '#0066ff', fontWeight: '900', fontSize: 16, marginBottom: 5 },
  bestSongImage: { width: '100%', aspectRatio: 1, borderRadius: 10 },
  bestSongInfo: { marginTop: 10 },
  bestSongTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  playCountText: { color: '#0066ff', fontSize: 11, fontWeight: '600' },
  actionCard: { 
    backgroundColor: '#011027', 
    borderWidth: 1, 
    borderColor: '#0066ff', 
    borderStyle: 'dashed', 
    padding: 30, 
    borderRadius: 12, 
    alignItems: 'center' 
  },
  actionText: { color: '#fff', marginTop: 10, fontWeight: '600' },
  emptyText: { color: '#b3b3b3', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0b0d12', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#282828' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  input: { backgroundColor: '#1a1d24', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 15 },
  fileRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  customUploadBox: { flex: 1, height: 100, borderWidth: 1, borderColor: '#333', borderStyle: 'dashed', borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 5 },
  uploadBoxText: { color: '#b3b3b3', fontSize: 10, marginTop: 5, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 50, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  submitBtn: { flex: 2, backgroundColor: '#0066ff', padding: 15, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  errorBox: { backgroundColor: 'rgba(255, 77, 77, 0.1)', padding: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ff4d4d' },
  errorText: { color: '#ff4d4d', fontSize: 12, textAlign: 'center' }
});