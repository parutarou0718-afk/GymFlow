import React, { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useStores } from '../../db/stores';
import { createGymService, type Gym } from '../../modules/gym';
import { createGymContextService } from '../../modules/gym-context';
import { createUserGymService } from '../../modules/user-gym';
import { DEFAULT_LOCAL_USER_ID } from '../../modules/user';
import { Card } from '../ui';
import { typography } from '../../lib/theme';

export function GymPicker({ onSelect }: { onSelect?: (gymId: string) => void }) {
  const store = useStores(); const gyms = useMemo(() => createGymService(store), [store]); const contexts = useMemo(() => createGymContextService(store), [store]); const relations = useMemo(() => createUserGymService(store), [store]); const [items, setItems] = useState<Gym[]>([]);
  useEffect(() => { void (async () => { const [all, current, home, recent, favorites] = await Promise.all([gyms.listGyms(), contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID), relations.getHomeGym(DEFAULT_LOCAL_USER_ID), relations.getRecentGyms(DEFAULT_LOCAL_USER_ID), relations.listUserGyms(DEFAULT_LOCAL_USER_ID, { favoriteOnly: true })]); const rank = new Map<string, number>(); [current, home?.gymId, ...recent.map(x => x.gymId), ...favorites.map(x => x.gymId)].forEach((id, i) => { if (id && !rank.has(id)) rank.set(id, i); }); setItems(all.filter(x => x.status !== 'closed').sort((a,b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99) || a.name.localeCompare(b.name))); })(); }, [contexts, gyms, relations]);
  return <>{items.map(gym => <Card key={gym.id} onPress={() => onSelect?.(gym.id)}><Text style={typography.body}>{gym.name}</Text></Card>)}</>;
}
