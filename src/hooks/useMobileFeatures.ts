import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';

export const useMobileFeatures = () => {
  const [isNative, setIsNative] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<any>(null);

  useEffect(() => {
    initializeMobileFeatures();
  }, []);

  const initializeMobileFeatures = async () => {
    try {
      // Check if running in native app
      const info = await Device.getInfo();
      setDeviceInfo(info);
      setIsNative(info.platform !== 'web');

      // Get network status
      const status = await Network.getStatus();
      setNetworkStatus(status);

      // Set up network listener
      Network.addListener('networkStatusChange', (status) => {
        setNetworkStatus(status);
      });

      // Configure status bar for mobile
      if (info.platform !== 'web') {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#3b82f6' });
      }

      // Handle app state changes
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

    } catch (error) {
      console.log('Mobile features not available:', error);
    }
  };

  const triggerHaptic = async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.log('Haptics not available:', error);
    }
  };

  const exitApp = async () => {
    try {
      await App.exitApp();
    } catch (error) {
      console.log('Exit app not available:', error);
    }
  };

  return {
    isNative,
    deviceInfo,
    networkStatus,
    triggerHaptic,
    exitApp
  };
};