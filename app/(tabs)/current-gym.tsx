import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createGymService, type Gym } from '../../src/modules/gym';
import { createGymContextService } from '../../src/modules/gym-context';
import { createInventoryService } from '../../src/modules/gym-inventory';
import { createMatchingService } from '../../src/modules/matching';
import { createProgramAdaptationService } from '../../src/modules/program-adaptation';
import { createProgramMatchingService, type ProgramGymMatchResult } from '../../src/modules/program-matching';
import { createProgramService, type Program } from '../../src/modules/program';
import { createTrainingFlowService } from '../../src/modules/training-flow';
import { createUserService, DEFAULT_LOCAL_USER_ID } from '../../src/modules/user';
import { createWorkoutService } from '../../src/modules/workout';
import { Button, Card, SectionHeader } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

export default function CurrentGymScreen() {
  const store = useStores();
  const gymApi = useMemo(() => createGymService(store), [store]);
  const contextApi = useMemo(() => createGymContextService(store), [store]);
  const programApi = useMemo(() => createProgramService(store), [store]);
  const flow = useMemo(() => {
    const matching = createMatchingService(store);
    const programMatching = createProgramMatchingService({ programs: programApi, matching });
    return createTrainingFlowService({ users: createUserService(store), gymContexts: contextApi, gyms: gymApi, inventory: createInventoryService(store), programs: programApi, programMatching, programAdaptation: createProgramAdaptationService({ programs: programApi, gyms: gymApi }), workouts: createWorkoutService(store) });
  }, [store, contextApi, gymApi, programApi]);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [currentGym, setCurrentGym] = useState<Gym | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [program, setProgram] = useState<Program | null>(null);
  const [match, setMatch] = useState<ProgramGymMatchResult | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const [allGyms, allPrograms] = await Promise.all([gymApi.listGyms(), programApi.listPrograms()]);
    setGyms(allGyms.filter(item => item.status !== 'closed'));
    setPrograms(allPrograms);
    const state = await flow.getTrainingFlowState({ userId: DEFAULT_LOCAL_USER_ID }).catch(() => null);
    setCurrentGym(state?.currentGym ?? null);
  }, [flow, gymApi, programApi]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const showError = (reason: unknown) => setError(reason instanceof Error ? reason.message : 'Operation failed');
  const selectGym = async (gym: Gym) => { try { setError(''); await contextApi.setCurrentGym(DEFAULT_LOCAL_USER_ID, gym.id); setCurrentGym(gym); setMatch(null); } catch (reason) { showError(reason); } };
  const matchProgram = async (item: Program) => { try { setError(''); setProgram(item); setMatch(await flow.matchProgramForCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: item.id, expectedGymId: currentGym?.id })); } catch (reason) { showError(reason); } };
  const startQuick = async () => { try { const session = await flow.startQuickWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, expectedGymId: currentGym?.id }); router.push({ pathname: '/active-workout' as any, params: { sessionId: session.id } }); } catch (reason) { showError(reason); } };
  const startProgram = () => { if (!program) return; Alert.alert('Start Program', `Start ${program.name} at ${currentGym?.name}?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Start', onPress: () => void flow.startProgramWorkoutAtCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId: program.id, expectedGymId: currentGym?.id }).then(session => router.push({ pathname: '/active-workout' as any, params: { sessionId: session.id } })).catch(showError) }]); };
  const adapt = () => { if (program) router.push({ pathname: '/replacement-review' as any, params: { programId: program.id } }); };

  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
    <Text style={typography.h1}>Current Gym</Text><Text style={typography.caption}>Development validation: selection only; it does not change Home, Favorites, or visits.</Text>
    {error ? <Text style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Text> : null}
    <SectionHeader title="Select current gym" />
    {gyms.map(gym => <Card key={gym.id} onPress={() => void selectGym(gym)} style={{ marginBottom: spacing.sm, borderColor: currentGym?.id === gym.id ? colors.primary : colors.border }}><Text style={typography.body}>{gym.name}</Text><Text style={typography.caption}>{currentGym?.id === gym.id ? 'Current' : 'Select'}</Text></Card>)}
    {currentGym ? <><Card><Text style={typography.h2}>{currentGym.name}</Text><Text style={typography.caption}>Inventory and matching use this Gym explicitly.</Text><Button title="Start Quick Workout" onPress={() => void startQuick()} /></Card><SectionHeader title="Program matching" />{programs.map(item => <Card key={item.id} onPress={() => void matchProgram(item)} style={{ marginBottom: spacing.sm }}><Text style={typography.body}>{item.name}</Text></Card>)}{match ? <Card><Text style={typography.h2}>{match.status}</Text><Text style={typography.caption}>{match.summary.executable} executable · {match.summary.replaceable} replaceable · {match.summary.unresolved} unresolved</Text><View style={{ marginTop: spacing.md }}>{match.status === 'requires_adaptation' ? <Button title="Create Adapted Program" onPress={() => void adapt()} /> : match.status !== 'not_executable' ? <Button title="Start Selected Program" onPress={startProgram} /> : null}</View></Card> : null}</> : <Text style={[typography.body, { marginTop: spacing.lg }]}>Select an active Gym to begin.</Text>}
  </ScrollView>;
}
