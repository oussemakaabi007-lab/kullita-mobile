import TrackPlayer, { Event } from 'react-native-track-player';

let lastEventTime = 0;
const DEBOUNCE_TIME = 1500; 

export const PlaybackService = async function() {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    
    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        const now = Date.now();
        if (now - lastEventTime > DEBOUNCE_TIME) {
            lastEventTime = now;
            await TrackPlayer.skipToNext();
        }
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        const now = Date.now();
        if (now - lastEventTime > DEBOUNCE_TIME) {
            lastEventTime = now;
            await TrackPlayer.skipToPrevious();
        }
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.reset());
    TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));
};