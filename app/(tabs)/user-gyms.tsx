import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createGymService, type Gym } from '../../src/modules/gym';
import { createUserService, type UserProfile } from '../../src/modules/user';
import { createUserGymService, type MembershipStatus, type UserGymRelationship } from '../../src/modules/user-gym';
import { Button, Card, Input, SectionHeader } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';
import { useCurrentUser } from '../../src/modules/current-user';

const statuses: MembershipStatus[] = ['active', 'inactive', 'unknown'];

export default function UserGymsScreen() {
  const identity = useCurrentUser();
  const store = useStores();
  const users = useMemo(() => createUserService(store), [store]);
  const gymsApi = useMemo(() => createGymService(store), [store]);
  const relationships = useMemo(() => createUserGymService(store), [store]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [items, setItems] = useState<UserGymRelationship[]>([]);
  const [recent, setRecent] = useState<UserGymRelationship[]>([]);
  const [selectedGymId, setSelectedGymId] = useState('');
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>('active');
  const [membershipStartedAt, setMembershipStartedAt] = useState('');
  const [membershipExpiresAt, setMembershipExpiresAt] = useState('');
  const [message, setMessage] = useState('');

  const reload = useCallback(async () => {
    const current = identity.user;
    if (!current) return;
    const [nextGyms, nextItems, nextRecent] = await Promise.all([gymsApi.listGyms(), relationships.listUserGyms(current.id), relationships.getRecentGyms(current.id)]);
    setUser(current); setGyms(nextGyms); setItems(nextItems); setRecent(nextRecent);
    if (!selectedGymId && nextGyms[0]) setSelectedGymId(nextGyms[0].id);
  }, [gymsApi, identity.user, relationships, selectedGymId]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const selected = gyms.find(item => item.id === selectedGymId);
  const relation = items.find(item => item.gymId === selectedGymId);
  const act = async (operation: () => Promise<unknown>) => { try { setMessage(''); await operation(); await reload(); setMessage('Saved and reloaded'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Operation failed'); } };
  const numberOrNull = (value: string) => value.trim() ? Number(value) : null;

  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
    <View style={{ padding: spacing.lg, paddingTop: spacing['4xl'] }}><Text style={typography.h1}>User Gyms</Text><Text style={typography.caption}>Development validation only. Visits are explicit; no Workout integration occurs.</Text></View>
    <Card style={{ marginHorizontal: spacing.lg }}><Text style={typography.label}>Current User ID</Text><Text style={typography.body}>{user?.id ?? 'Loading…'}</Text></Card>
    <SectionHeader title="Gyms" subtitle="Create a Gym first if this list is empty" />
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>{gyms.map(gym => <TouchableOpacity key={gym.id} onPress={() => setSelectedGymId(gym.id)}><Card style={{ borderColor: selectedGymId === gym.id ? colors.primary : colors.border }}><Text style={typography.body}>{gym.name}</Text><Text style={typography.caption}>{gym.status} · {items.find(item => item.gymId === gym.id)?.isHome ? 'Home' : 'Not home'}</Text></Card></TouchableOpacity>)}</View>
    {selected && user ? <><SectionHeader title={`${selected.name} relationship`} /><View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      <Text style={typography.caption}>Favorite: {relation?.isFavorite ? 'yes' : 'no'} · Last visit: {relation?.lastVisitedAt ?? 'none'}</Text>
      <Button title={relation?.isHome ? 'Current Home Gym' : 'Set Home Gym'} onPress={() => void act(() => relationships.setHomeGym(user.id, selected.id))} disabled={relation?.isHome || selected.status === 'closed'} />
      <Button title="Clear Home Gym" onPress={() => void act(() => relationships.clearHomeGym(user.id))} variant="ghost" />
      <Button title={relation?.isFavorite ? 'Unfavorite Gym' : 'Favorite Gym'} onPress={() => void act(() => relationships.setFavorite(user.id, selected.id, !relation?.isFavorite))} variant="secondary" />
      <Button title="Record Visit" onPress={() => void act(() => relationships.recordGymVisit(user.id, selected.id))} variant="secondary" disabled={selected.status === 'closed'} />
      <Text style={typography.label}>Membership status</Text><Button title={membershipStatus} onPress={() => setMembershipStatus(value => statuses[(statuses.indexOf(value) + 1) % statuses.length]!)} variant="secondary" />
      <Input label="Membership started at (timestamp, optional)" value={membershipStartedAt} onChangeText={setMembershipStartedAt} keyboardType="numeric" placeholder="Optional" />
      <Input label="Membership expires at (timestamp, optional)" value={membershipExpiresAt} onChangeText={setMembershipExpiresAt} keyboardType="numeric" placeholder="Optional" />
      <Button title="Save Membership" onPress={() => void act(() => relationships.setMembership(user.id, selected.id, { status: membershipStatus, startedAt: numberOrNull(membershipStartedAt), expiresAt: numberOrNull(membershipExpiresAt) }))} variant="secondary" />
      <Button title="Clear Membership" onPress={() => void act(() => relationships.clearMembership(user.id, selected.id))} variant="ghost" />
    </View></> : null}
    <SectionHeader title="Recent Gyms" />
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>{recent.map(item => <Card key={item.id}><Text style={typography.body}>{gyms.find(gym => gym.id === item.gymId)?.name ?? item.gymId}</Text><Text style={typography.caption}>{item.lastVisitedAt}</Text></Card>)}{!recent.length ? <Text style={typography.caption}>No recorded visits.</Text> : null}<Button title="Reload" onPress={() => void reload()} variant="ghost" />{message ? <Text style={{ color: message === 'Saved and reloaded' ? colors.textSecondary : colors.danger }}>{message}</Text> : null}</View>
  </ScrollView>;
}
