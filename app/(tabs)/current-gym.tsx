import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createGymService, type Gym } from '../../src/modules/gym';
import { createGymContextService } from '../../src/modules/gym-context';
import { createInventoryService } from '../../src/modules/gym-inventory';
import { useCurrentUser } from '../../src/modules/current-user';
import { Card, SectionHeader } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

export default function CurrentGymScreen() {
  const { user } = useCurrentUser();
  const store = useStores();
  const gymApi = useMemo(() => createGymService(store), [store]);
  const contextApi = useMemo(() => createGymContextService(store), [store]);
  const inventoryApi = useMemo(() => createInventoryService(store), [store]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [currentGym, setCurrentGym] = useState<Gym | null>(null);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [currentGymUnavailable, setCurrentGymUnavailable] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const [allGyms, currentGymId] = await Promise.all([
      gymApi.listGyms(),
      user ? contextApi.getCurrentGym(user.id) : Promise.resolve(null),
    ]);
    setGyms(allGyms.filter(item => item.status !== 'closed'));
    const selected = currentGymId ? await gymApi.getGym(currentGymId) : null;
    const available = selected?.status === 'active' ? selected : null;
    setCurrentGym(available);
    setCurrentGymUnavailable(Boolean(currentGymId && !available));
    setInventoryCount(available ? (await inventoryApi.getGymEquipment(available.id)).length : 0);
  }, [contextApi, gymApi, inventoryApi, user]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const selectGym = async (gym: Gym) => {
    try {
      setError('');
      if (!user) return;
      await contextApi.setCurrentGym(user.id, gym.id);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to choose this training location');
    }
  };

  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
    <Text style={typography.h1}>Choose where you’re training</Text>
    <Text style={typography.caption}>This sets your training location only. It does not change your Home Gym, favorites, or visits.</Text>
    {error ? <Text style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Text> : null}
    {currentGymUnavailable ? <Card><Text style={typography.body}>Your previous training location is unavailable.</Text><Text style={typography.caption}>Choose another active Gym below.</Text></Card> : null}
    {currentGym ? <Card><Text style={typography.caption}>Today at</Text><Text style={typography.h2}>{currentGym.name}</Text><Text style={typography.caption}>{inventoryCount > 0 ? `Equipment data available (${inventoryCount} items)` : 'Equipment data is limited'}</Text></Card> : null}
    <SectionHeader title="Available training locations" />
    {gyms.map(gym => <Card key={gym.id} onPress={() => void selectGym(gym)} style={{ marginBottom: spacing.sm, borderColor: currentGym?.id === gym.id ? colors.primary : colors.border }}><Text style={typography.body}>{gym.name}</Text><Text style={typography.caption}>{currentGym?.id === gym.id ? 'Current' : 'Select'}</Text></Card>)}
  </ScrollView>;
}
