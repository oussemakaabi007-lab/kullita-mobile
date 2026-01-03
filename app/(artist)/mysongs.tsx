import { useKeepFullScreen } from "@/hooks/useKeepFullScreen";
import { api } from "@/services/api";
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import {
    Edit2,
    Music,
    Plus,
    Trash2,
    Upload,
    X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SongsPage() {
  useKeepFullScreen();
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<any>(null);

  const fetchSongs = async () => {
    try {
      const res = await api.get('/songs/mysongs');
      setSongs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSongs();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSongs();
  };

  const handleDelete = async () => {
    if (!selectedSong) return;
    try {
      await api.delete('/songs/deletemysong', {
        data: { songId: selectedSong.id }
      });
      setSongs(songs.filter(s => s.id !== selectedSong.id));
      setIsDeleteOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.appContainer}>
      <View style={styles.contentPadding}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>My Music Library</Text>
          <TouchableOpacity style={styles.addMainBtn} onPress={() => setIsAddOpen(true)}>
            <Plus size={20} color="#fff" />
            <Text style={styles.btnText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#2E79FF" style={{ marginTop: 50 }} />
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                tintColor="#2E79FF" 
                colors={["#2E79FF"]}
              />
            }
          >
            {songs.length === 0 ? (
              <Text style={styles.emptyText}>No songs found. Start by uploading one!</Text>
            ) : (
              songs.map((song, index) => (
                <View key={song.id} style={styles.songRow}>
                  <Text style={styles.indexCol}>{index + 1}</Text>
                  <Image source={{ uri: song.coverUrl || 'https://via.placeholder.com/150' }} style={styles.songThumb} />
                  <View style={styles.songMeta}>
                    <Text style={styles.songTitleText} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.playCountText}>{song.listenCount || 0} plays</Text>
                  </View>
                  <View style={styles.actionsCol}>
                    <TouchableOpacity 
                      onPress={() => { setSelectedSong(song); setIsEditOpen(true); }}
                      style={styles.actionIcon}
                    >
                      <Edit2 size={18} color="#b3b3b3" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => { setSelectedSong(song); setIsDeleteOpen(true); }}
                      style={styles.actionIcon}
                    >
                      <Trash2 size={18} color="#ff4d4d" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      <UploadModal 
        visible={isAddOpen} 
        mode="Add" 
        onClose={() => setIsAddOpen(false)} 
        onSuccess={fetchSongs} 
      />

      <UploadModal 
        visible={isEditOpen} 
        mode="Edit" 
        initialData={selectedSong} 
        onClose={() => setIsEditOpen(false)} 
        onSuccess={fetchSongs} 
      />

      <Modal visible={isDeleteOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.modalTitleText}>Remove Song?</Text>
            <Text style={styles.modalSubText}>Are you sure you want to delete "{selectedSong?.title}"?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsDeleteOpen(false)}>
                <Text style={styles.btnLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteSubmitBtn} onPress={handleDelete}>
                <Text style={styles.btnLabel}>Delete Forever</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function UploadModal({ visible, onClose, mode, initialData, onSuccess }: any) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [audio, setAudio] = useState<any>(null);
  const [cover, setCover] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initialData?.title || "");
      setAudio(null);
      setCover(null);
      setError(null);
    }
  }, [visible, initialData]);

  const pickAudio = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: 'audio/*' });
    if (!result.canceled) {
      setAudio(result.assets[0]);
      setError(null);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setCover(result.assets[0]);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) {
      setError("Song title is required.");
      return;
    }

    if (mode === "Add" && (!audio || !cover)) {
      setError("Both audio and cover files are required.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('title', title);
    if (mode === "Edit") formData.append('songId', initialData.id);

    if (audio) {
      formData.append('audio', {
        uri: audio.uri,
        name: audio.name || 'track.mp3',
        type: audio.mimeType || 'audio/mpeg',
      } as any);
    }

    if (cover) {
      formData.append('cover', {
        uri: cover.uri,
        name: 'cover.jpg',
        type: 'image/jpeg',
      } as any);
    }

    try {
      const url = mode === "Edit" ? '/songs/edit' : '/songs/upload';
      const method = mode === "Edit" ? 'patch' : 'post';
      
      await api[method](url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onSuccess();
      onClose();
    } catch (e: any) {
      setError("Upload failed. Please check your connection.");
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
            <Text style={styles.modalTitleText}>{mode} Song</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color="#fff" /></TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Song Title</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Moonlight Sonata" 
              placeholderTextColor="#555"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if(error) setError(null);
              }}
            />
          </View>

          <View style={styles.fileRow}>
            <TouchableOpacity style={styles.customUploadBox} onPress={pickAudio}>
              <Music size={24} color="#2E79FF" />
              <Text style={styles.uploadBoxText} numberOfLines={1}>
                {audio ? audio.name : (mode === "Edit" ? "Change Audio" : "Select Audio")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.customUploadBox} onPress={pickImage}>
              <Upload size={24} color="#2E79FF" />
              <Text style={styles.uploadBoxText} numberOfLines={1}>
                {cover ? "Selected" : (mode === "Edit" ? "Change Cover" : "Select Cover")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.btnLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnLabel}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: '#05070A' },
  contentPadding: { padding: 20, flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '700' },
  addMainBtn: { backgroundColor: '#2E79FF', flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  songRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0D14', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1A1D24' },
  indexCol: { color: '#555', width: 25, fontSize: 14, fontWeight: '600' },
  songThumb: { width: 50, height: 50, borderRadius: 6, marginRight: 15 },
  songMeta: { flex: 1 },
  songTitleText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  playCountText: { color: '#2E79FF', fontSize: 12, marginTop: 2 },
  actionsCol: { flexDirection: 'row', gap: 15 },
  actionIcon: { padding: 5 },
  emptyText: { color: '#b3b3b3', textAlign: 'center', marginTop: 50 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#0A0D14', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#1A1D24' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitleText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalSubText: { color: '#b3b3b3', marginBottom: 25, fontSize: 16 },
  label: { color: '#b3b3b3', marginBottom: 8, fontSize: 14 },
  inputGroup: { marginBottom: 20 },
  input: { backgroundColor: '#14171F', borderRadius: 10, padding: 15, color: '#fff', borderWidth: 1, borderColor: '#1A1D24' },
  fileRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  customUploadBox: { flex: 1, height: 100, backgroundColor: '#14171F', borderStyle: 'dashed', borderWidth: 1, borderColor: '#2E79FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: 10 },
  uploadBoxText: { color: '#b3b3b3', fontSize: 11, marginTop: 8, textAlign: 'center' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#1A1D24', alignItems: 'center' },
  submitBtn: { flex: 2, padding: 15, borderRadius: 12, backgroundColor: '#2E79FF', alignItems: 'center' },
  deleteModal: { backgroundColor: '#0A0D14', padding: 25, borderRadius: 20, borderWidth: 1, borderColor: '#ff4d4d33' },
  deleteSubmitBtn: { flex: 2, padding: 15, borderRadius: 12, backgroundColor: '#ff4d4d', alignItems: 'center' },
  btnLabel: { color: '#fff', fontWeight: '700' },
  errorBox: { backgroundColor: '#ff4d4d1a', padding: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ff4d4d33' },
  errorText: { color: '#ff4d4d', fontSize: 13, textAlign: 'center', fontWeight: '500' }
});