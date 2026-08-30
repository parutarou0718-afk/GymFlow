import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useStores } from '../src/db/stores';
import { createGymService, type Gym } from '../src/modules/gym';
import { createGymContextService } from '../src/modules/gym-context';
import { createInventoryService, type GymEquipmentInventoryItem } from '../src/modules/gym-inventory';
import { createProgramService, type Program } from '../src/modules/program';
import { createProgramMatchingService, type ProgramGymMatchResult } from '../src/modules/program-matching';
import { createMatchingService } from '../src/modules/matching';
import { createUserGymService, type UserGymRelationship } from '../src/modules/user-gym';
import { DEFAULT_LOCAL_USER_ID } from '../src/modules/user';
import { createWorkoutService, type WorkoutSession } from '../src/modules/workout';
import { Button, Card, SectionHeader } from '../src/components/ui';
import { colors, spacing, typography } from '../src/lib/theme';

export default function GymDetailScreen() {
  const { gymId } = useLocalSearchParams<{ gymId: string }>();
  const store = useStores();
  const gyms = useMemo(() => createGymService(store), [store]);
  const contexts = useMemo(() => createGymContextService(store), [store]);
  const userGyms = useMemo(() => createUserGymService(store), [store]);
  const inventoryApi = useMemo(() => createInventoryService(store), [store]);
  const programs = useMemo(() => createProgramService(store), [store]);
  const workouts = useMemo(() => createWorkoutService(store), [store]);
  const matcher = useMemo(() => createProgramMatchingService({ programs, matching: createMatchingService(store) }), [programs, store]);
  const [gym, setGym] = useState<Gym | null>(null);
  const [relationship, setRelationship] = useState<UserGymRelationship | null>(null);
  const [inventory, setInventory] = useState<GymEquipmentInventoryItem[]>([]);
  const [recent, setRecent] = useState<WorkoutSession[]>([]);
  const [programList, setProgramList] = useState<Program[]>([]);
  const [match, setMatch] = useState<ProgramGymMatchResult | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!gymId) return;
    const next = await gyms.getGym(gymId);
    setGym(next);
    if (!next) return;
    const [relation, items, history, list] = await Promise.all([
      userGyms.getUserGymRelationship(DEFAULT_LOCAL_USER_ID, gymId),
      inventoryApi.getGymEquipment(gymId),
      workouts.listCompletedWorkouts({ gymId, limit: 5 }),
      programs.listPrograms(),
    ]);
    setRelationship(relation);
    setInventory(items);
    setRecent(history);
    setProgramList(list);
  }, [gymId, gyms, inventoryApi, programs, userGyms, workouts]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!gym) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={typography.body}>Gym not found</Text></View>;
  }

  const setCurrent = async () => {
    try {
      await contexts.setCurrentGym(DEFAULT_LOCAL_USER_ID, gym.id);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to set current Gym');
    }
  };
  const toggleFavorite = async () => { await userGyms.setFavorite(DEFAULT_LOCAL_USER_ID, gym.id, !relationship?.isFavorite); await load(); };
  const toggleHome = async () => {
    if (relationship?.isHome) await userGyms.clearHomeGym(DEFAULT_LOCAL_USER_ID);
    else await userGyms.setHomeGym(DEFAULT_LOCAL_USER_ID, gym.id);
    await load();
  };
  const shareGym = () => router.push({ pathname: '/(tabs)/social' as any, params: { gymId: gym.id } });
  const matchAtGym = async (programId: string) => {
    try {
      setMatch(await matcher.matchProgramToGym({ programId, gymId: gym.id, includeAlternatives: true }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Matching failed');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
      <Text style={typography.h1}>{gym.name}</Text>
      <Text style={typography.caption}>{gym.address || 'Not available'} · {gym.status}</Text>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <Card>
        <Text style={typography.body}>Home: {relationship?.isHome ? 'Yes' : 'No'} · Favorite: {relationship?.isFavorite ? 'Yes' : 'No'}</Text>
        <Text style={typography.caption}>Last visited: {relationship?.lastVisitedAt ? new Date(relationship.lastVisitedAt).toLocaleDateString() : 'Not available'}</Text>
        <Button title="Share Gym" variant="secondary" onPress={shareGym} />
        <Button title="Set as Current Gym" onPress={() => void setCurrent()} disabled={gym.status === 'closed'} />
        <Button title={relationship?.isHome ? 'Clear Home Gym' : 'Set as Home'} variant="secondary" onPress={() => void toggleHome()} />
        <Button title={relationship?.isFavorite ? 'Unfavorite' : 'Favorite'} variant="secondary" onPress={() => void toggleFavorite()} />
      </Card>
      <SectionHeader title="Equipment" />
      {inventory.length ? inventory.map(item => <Card key={item.id}><Text style={typography.body}>{item.equipmentId} × {item.quantity}</Text><Text style={typography.caption}>{item.status}</Text></Card>) : <Text style={typography.caption}>No equipment information</Text>}
      <SectionHeader title="Recent Workouts Here" />
      {recent.length ? recent.map(item => <Card key={item.id} onPress={() => router.push({ pathname: '/session-detail' as any, params: { sessionId: item.id } })}><Text style={typography.body}>{item.templateName || 'Quick Workout'}</Text></Card>) : <Text style={typography.caption}>No workouts here yet</Text>}
      <SectionHeader title="Check a Program at this Gym" />
      {programList.map(item => <Card key={item.id} onPress={() => void matchAtGym(item.id)}><Text style={typography.body}>{item.name}</Text></Card>)}
      {match ? <Card><Text style={typography.body}>{match.status}</Text></Card> : null}
    </ScrollView>
  );
}
