import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Dimensions,
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2; 

interface SongCardProps {
  id: number;
  title: string;
  artist: string;
  cover: string;
  onClick?: () => void;
  isActive?: boolean;
}

const SongCard = ({ title, artist, cover, onClick, isActive }: SongCardProps) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.8} 
      onPress={onClick} 
      style={[styles.card, isActive && styles.activeCard]}
    >
      <ImageBackground 
        source={{ uri: cover }} 
        style={styles.backgroundImage}
        imageStyle={{ borderRadius: 12 }}

      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.95)']}
          style={styles.scrim}
        >
          <View style={styles.cardContent}>
            {isActive && 
              <View style={styles.eqContainer}>
                <View style={[styles.box, styles.box1]} />
                <View style={[styles.box, styles.box2]} />
                <View style={[styles.box, styles.box3]} />
                <View style={[styles.box, styles.box4]} />
              </View>}
            

            <View style={styles.info}>
              <Text style={styles.songTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.artistName} numberOfLines={1}>
                {artist}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: '#2E79FF',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scrim: {
    flex: 1,
    borderRadius: 12,
    justifyContent: 'flex-end',
    padding: 12,
  },
  cardContent: {
    width: '100%',
  },
  playIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  eqContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 20,
    marginBottom: 8,
  },
  box: {
    width: 3,
    backgroundColor: '#2E79FF',
    borderRadius: 1,
  },
  box1: { height: 12 },
  box2: { height: 18 },
  box3: { height: 10 },
  box4: { height: 15 },
  
  info: {
    marginTop: 4,
  },
  songTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  artistName: {
    color: '#b3b3b3',
    fontSize: 12,
    marginTop: 2,
  },
});

export default SongCard;