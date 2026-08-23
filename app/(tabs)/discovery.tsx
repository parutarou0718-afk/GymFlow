import React, { useMemo, useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import { useStores } from '../../src/db/stores';
import { createGymDiscoveryService, unavailableExternalGymProvider } from '../../src/modules/gym-discovery';

export default function DiscoveryScreen() { const store = useStores(); const api = useMemo(() => createGymDiscoveryService({ provider: unavailableExternalGymProvider, links: store.gymExternalLinks, importer: store.gymDiscoveryImport }), [store]); const [query, setQuery] = useState(''); const [status, setStatus] = useState(''); return <View style={{ padding: 20, gap: 12 }}><Text style={{ fontSize: 22 }}>Gym Discovery</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search gyms" style={{ borderWidth: 1, padding: 10 }} /><Button title="Search" onPress={() => void api.searchExternalGyms({ query }).then(result => setStatus(result.status))} /><Text>Provider result: {status || 'not searched'}</Text></View>; }
