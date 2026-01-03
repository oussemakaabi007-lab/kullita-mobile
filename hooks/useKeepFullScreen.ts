import * as NavigationBar from 'expo-navigation-bar';
import { setStatusBarHidden } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function useKeepFullScreen() {
    const hideTimerRef = useRef<any>(null);

    useEffect(() => {
        if (Platform.OS === 'android') {
            const configure = async () => {
                await NavigationBar.setPositionAsync('absolute');
                await NavigationBar.setBackgroundColorAsync('#00000000');
                await NavigationBar.setVisibilityAsync('hidden');
                await NavigationBar.setBehaviorAsync('overlay-swipe');
                setStatusBarHidden(true, 'fade');
            };

            configure();

            const subscription = NavigationBar.addVisibilityListener(({ visibility }) => {
                if (visibility === 'visible') {
                    setStatusBarHidden(false, 'fade');
                    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
                    hideTimerRef.current = setTimeout(async () => {
                        await NavigationBar.setVisibilityAsync('hidden');
                        setStatusBarHidden(true, 'fade');
                    }, 3000);
                }
            });

            return () => {
                subscription.remove();
                if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            };
        }
    }, []);
}