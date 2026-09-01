import React, { useEffect, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useStores } from '../../db/stores';
import { createGymService, type Gym } from '../../modules/gym';
import { createGymContextService } from '../../modules/gym-context';
import { createUserGymService } from '../../modules/user-gym';
import { useCurrentUser } from '../../modules/current-user';
import { Card } from '../ui';
import { typography } from '../../lib/theme';

export function GymPicker({ onSelect }: { onSelect?: (gymId: string) => void }) {
  const { user } = useCurrentUser();
  const store = useStores(); const gyms = useMemo(() => createGymService(store), [store]); const contexts = useMemo(() => createGymContextService(store), [store]); const relations = useMemo(() => createUserGymService(store), [store]); const [items, setItems] = useState<Gym[]>([]);
  useEffect(() => { if (!user) return; void (async () => { const [all, current, home, recent, favorites] = await Promise.all([gyms.listGyms(), contexts.getCurrentGym(user.id), relations.getHomeGym(user.id), relations.getRecentGyms(user.id), relations.listUserGyms(user.id, { favoriteOnly: true })]); const rank = new Map<string, number>(); [current, home?.gymId, ...recent.map(x => x.gymId), ...favorites.map(x => x.gymId)].forEach((id, i) => { if (id && !rank.has(id)) rank.set(id, i); }); setItems(all.filter(x => x.status !== 'closed').sort((a,b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99) || a.name.localeCompare(b.name))); })(); }, [contexts, gyms, relations, user]);
  return <>{items.map(gym => <Card key={gym.id} onPress={() => onSelect?.(gym.id)}><Text style={typography.body}>{gym.name}</Text></Card>)}</>;
}
