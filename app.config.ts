import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_NAME = 'Vision Navigation';
const APP_SLUG = 'vision-navigation';
const ANDROID_PACKAGE = 'com.enoch015.visionnavigation';
const IOS_BUNDLE = 'com.enoch015.visionnavigation';
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_NAME,
  slug: APP_SLUG,
  scheme: 'visionnav',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#030712'
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: IOS_BUNDLE,
    config: {
      googleMapsApiKey: GOOGLE_MAPS_API_KEY
    }
  },
  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#030712'
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'FOREGROUND_SERVICE'
    ],
    config: {
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY
      }
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    newArchEnabled: true
  },
  web: {
    favicon: './assets/favicon.png'
  },
  experiments: {
    typedRoutes: false
  },
  extra: {
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    eas: {
      projectId: EAS_PROJECT_ID
    }
  }
});
