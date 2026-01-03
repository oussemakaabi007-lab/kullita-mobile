import { Redirect } from "expo-router";
import { useAuth } from "./_layout"; 
import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from "react-native-track-player";

// IMPORTANT: TrackPlayer.setupPlayer() should only happen once globally.
let isPlayerSetup = false;

async function initializePlayer() {
  if (isPlayerSetup) return;
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    });
    isPlayerSetup = true;
  } catch (e) {
    // If it's already initialized, we ignore the error
    isPlayerSetup = true;
  }
}

export default function EntryPoint() {
  const { user, initialized: authInitialized } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializePlayer().then(() => setIsReady(true));
  }, []);

  if (!authInitialized || !isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#2E79FF" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(public)/login" />;
  }

  return <Redirect href={user.role === 'artist' ? "/(artist)/dashboard" : "/(user)"} />;
}