import React, { useCallback, useMemo, useState } from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createGymService } from '../../src/modules/gym';
import { createLocationService, unavailableLocationProvider } from '../../src/modules/location';

export default function LocationValidationScreen() {
  const store = useStores();
  const gymApi = useMemo(() => createGymService(store), [store]);
  const locationApi = useMemo(() => createLocationService({ gymService: gymApi, locationProvider: unavailableLocationProvider }), [gymApi]);
  const [latitude, setLatitude] = useState('35.6762');
  const [longitude, setLongitude] = useState('139.6503');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('');
  const origin = () => ({ latitude: Number(latitude), longitude: Number(longitude) });
  const load = useCallback(async () => setStatus((await locationApi.getCurrentLocation()).status), [locationApi]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
    <Text style={{ fontSize: 22, fontWeight: '700' }}>Location validation</Text>
    <Text>Current Location: {status || 'loading'}</Text>
    <TextInput value={latitude} onChangeText={setLatitude} placeholder="Latitude" keyboardType="decimal-pad" style={{ borderWidth: 1, padding: 10 }} />
    <TextInput value={longitude} onChangeText={setLongitude} placeholder="Longitude" keyboardType="decimal-pad" style={{ borderWidth: 1, padding: 10 }} />
    <Button title="List Nearby Gyms" onPress={() => void locationApi.listNearbyGyms({ origin: origin() }).then(result => setOutput(result.status === 'available' ? result.gyms.map(item => `${item.gym.name}: ${Math.round(item.distanceMeters)} m`).join('\n') || 'No nearby gyms' : result.status))} />
    <View><Text>{output}</Text></View>
  </ScrollView>;
}
