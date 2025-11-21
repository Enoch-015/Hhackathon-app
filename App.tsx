import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import MapView, { LongPressEvent, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssistiveButton } from './src/components/AssistiveButton';
import { InfoCard } from './src/components/InfoCard';
import { StatusChip } from './src/components/StatusChip';
import { useAccessibleLocation } from './src/hooks/useAccessibleLocation';
import { palette } from './src/theme/colors';
import { speak, stopSpeech } from './src/utils/voiceAssistant';

type GuidanceMode = 'idle' | 'listening' | 'navigating';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FALLBACK_REGION: Region = {
  latitude: 37.7937,
  longitude: -122.3965,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01
};

export default function App() {
  const mapRef = useRef<MapView | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>(FALLBACK_REGION);
  const [destination, setDestination] = useState<Region | null>(null);
  const [mode, setMode] = useState<GuidanceMode>('idle');
  const { status, coords, heading, errorMessage, requestPermission } = useAccessibleLocation();

  const destinationDistance = useMemo(() => {
    if (!coords || !destination) return null;
    return haversineDistance(coords.latitude, coords.longitude, destination.latitude, destination.longitude);
  }, [coords, destination]);

  const statusMessage = useMemo(() => {
    if (errorMessage) return errorMessage;
    if (status === 'denied') return 'Location permission denied. Tap to retry.';
    if (status === 'requesting') return 'Requesting location securely…';
    if (status === 'ready' && destinationDistance) {
      const rounded = Math.max(destinationDistance, 1).toFixed(0);
      return `Destination is ${rounded} meters away.`;
    }
    if (status === 'ready') return 'Location lock acquired. Long press map to drop a destination pin.';
    return 'Initializing sensors…';
  }, [destinationDistance, errorMessage, status]);

  const statusTone = useMemo<'neutral' | 'warning' | 'success'>(() => {
    if (status === 'ready') return 'success';
    if (status === 'denied' || status === 'error') return 'warning';
    return 'neutral';
  }, [status]);

  useEffect(() => {
    if (!coords) return;

    const nextRegion: Region = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008
    };

    setMapRegion(nextRegion);
    mapRef.current?.animateCamera(
      {
        center: { latitude: nextRegion.latitude, longitude: nextRegion.longitude },
        pitch: 0,
        zoom: 17,
        heading: heading ?? 0
      },
      { duration: 600 }
    );
  }, [coords, heading]);

  const handleMapLongPress = (event: LongPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const pinnedRegion: Region = {
      latitude,
      longitude,
      latitudeDelta: 0.003,
      longitudeDelta: 0.003
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDestination(pinnedRegion);
    setMode('navigating');
    speak('Destination pinned. Guidance locked in. Use announce to hear distance updates.');
  };

  const handleAnnounceSurroundings = () => {
    if (!coords) {
      speak('Still searching for your location. Stay still or move to open space.');
      return;
    }

    const locationMessage = `You are at latitude ${coords.latitude.toFixed(4)} and longitude ${coords.longitude.toFixed(4)}.`;
    if (!destination) {
      speak(`${locationMessage} Long press the map to choose where you want to go.`);
      return;
    }

    const distance = destinationDistance ?? 0;
    const direction = describeDirection(coords.latitude, coords.longitude, destination.latitude, destination.longitude);
    const spokenDistance = distance > 1000 ? `${(distance / 1000).toFixed(2)} kilometers` : `${distance.toFixed(0)} meters`;
    speak(`${locationMessage} Destination is ${spokenDistance} away towards the ${direction}.`);
  };

  const handleDestinationPrompt = () => {
    setMode('listening');
    speak('Long press anywhere on the map to place your destination pin.');
  };

  const handleStartGuidance = () => {
    if (!destination) {
      speak('Set a destination by long pressing the map first.');
      return;
    }

    setMode('navigating');
    speak('Guidance mode engaged. Follow the vibration and voice updates while moving forward carefully.');
  };

  const handleRecenter = () => {
    stopSpeech();
    if (!coords) {
      requestPermission();
      return;
    }

    const nextRegion: Region = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008
    };

    setMapRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 400);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          initialRegion={FALLBACK_REGION}
          region={mapRegion}
          onRegionChangeComplete={(region) => setMapRegion(region)}
          onLongPress={handleMapLongPress}
          showsUserLocation
          showsCompass
          showsScale
          accessibilityLabel="Live map view"
        >
          {destination ? (
            <Marker
              coordinate={destination}
              pinColor={palette.accent}
              title="Destination"
              description="Pinned guidance target"
            />
          ) : null}
        </MapView>

        <View style={styles.topOverlay}>
          <StatusChip label={statusMessage} tone={statusTone} />
          <Text style={styles.modeLabel}>{describeMode(mode)}</Text>
        </View>

        <TouchableOpacity style={styles.recenterButton} onPress={handleRecenter} accessibilityLabel="Recenter on my position">
          <MaterialIcons name="my-location" size={22} color={palette.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSheet}>
        <InfoCard title="Navigation Hub" caption="Long press map to set destination">
          <Text style={styles.infoText}>{statusMessage}</Text>
          {destinationDistance ? (
            <Text style={styles.infoText}>
              Distance: <Text style={styles.infoEmphasis}>{destinationDistance.toFixed(0)} m</Text>
            </Text>
          ) : null}
        </InfoCard>

        <AssistiveButton
          label="Announce surroundings"
          description="Hear your current coordinates and destination direction"
          icon={<MaterialIcons name="campaign" size={24} color={palette.textPrimary} />}
          onPress={handleAnnounceSurroundings}
        />

        <AssistiveButton
          label="Set destination"
          description="Long press the map after this prompt"
          icon={<MaterialIcons name="add-location-alt" size={24} color={palette.textPrimary} />}
          onPress={handleDestinationPrompt}
          tone="secondary"
        />

        <AssistiveButton
          label="Start guidance"
          description="Receive continuous cues while moving"
          icon={<MaterialIcons name="assistant-navigation" size={24} color={palette.textPrimary} />}
          onPress={handleStartGuidance}
          disabled={!destination}
        />
      </View>
    </SafeAreaView>
  );
}

function describeMode(mode: GuidanceMode) {
  switch (mode) {
    case 'listening':
      return 'Pin placement mode active';
    case 'navigating':
      return 'Guiding you safely';
    default:
      return 'Standing by';
  }
}

function describeDirection(lat1: number, lon1: number, lat2: number, lon2: number) {
  const bearing = calculateBearing(lat1, lon1, lat2, lon2);
  const directions = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  const index = Math.round(bearing / 45) % directions.length;
  return directions[index];
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background
  },
  mapWrapper: {
    flex: 1
  },
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 48 : 24,
    left: 20,
    right: 20,
    zIndex: 10,
    gap: 12
  },
  modeLabel: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '600'
  },
  recenterButton: {
    position: 'absolute',
    bottom: Dimensions.get('window').height * 0.3,
    right: 18,
    padding: 12,
    borderRadius: 999,
    backgroundColor: '#111827ee'
  },
  bottomSheet: {
    backgroundColor: palette.surface,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20
  },
  infoText: {
    color: palette.textSecondary,
    fontSize: 14,
    marginBottom: 4
  },
  infoEmphasis: {
    color: palette.textPrimary,
    fontWeight: '700'
  }
});
