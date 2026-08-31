import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useStores } from '../src/db/stores';
import { createProgramService, type Program } from '../src/modules/program';
import { createGymContextService } from '../src/modules/gym-context';
import { createGymService, type Gym } from '../src/modules/gym';
import { createMatchingService } from '../src/modules/matching';
import { createProgramMatchingService, type ProgramGymMatchResult } from '../src/modules/program-matching';
import { DEFAULT_LOCAL_USER_ID, createUserService } from '../src/modules/user';
import { createInventoryService } from '../src/modules/gym-inventory';
import { createProgramAdaptationService } from '../src/modules/program-adaptation';
import { createWorkoutService } from '../src/modules/workout';
import { createTrainingFlowService } from '../src/modules/training-flow';
import { Button, Card } from '../src/components/ui';
import { colors, spacing, typography } from '../src/lib/theme';

export default function ProgramDetailScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const store = useStores();
  const programs = useMemo(() => createProgramService(store), [store]);
  const contexts = useMemo(() => createGymContextService(store), [store]);
  const gyms = useMemo(() => createGymService(store), [store]);
  const flow = useMemo(() => createTrainingFlowService({
    users: createUserService(store),
    gymContexts: contexts,
    gyms,
    inventory: createInventoryService(store),
    programs,
    programMatching: createProgramMatchingService({ programs, matching: createMatchingService(store) }),
    programAdaptation: createProgramAdaptationService({ programs, gyms }),
    workouts: createWorkoutService(store),
  }), [contexts, gyms, programs, store]);
  const [program, setProgram] = useState<Program | null>(null);
  const [currentGym, setCurrentGym] = useState<Gym | null>(null);
  const [currentGymUnavailable, setCurrentGymUnavailable] = useState(false);
  const [match, setMatch] = useState<ProgramGymMatchResult | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!programId) return;
    const [nextProgram, currentGymId] = await Promise.all([
      programs.getProgram(programId),
      contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID),
    ]);
    const selectedGym = currentGymId ? await gyms.getGym(currentGymId) : null;
    const availableGym = selectedGym?.status === 'active' ? selectedGym : null;
    setProgram(nextProgram);
    setCurrentGym(availableGym);
    setCurrentGymUnavailable(Boolean(currentGymId && !availableGym));
    setMatch(null);
    setError('');
  }, [contexts, gyms, programId, programs]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const matchAtCurrentGym = async () => {
    if (!program || !currentGym) return;
    try {
      setError('');
      setMatch(await flow.matchProgramForCurrentGym({
        userId: DEFAULT_LOCAL_USER_ID,
        programId: program.id,
        expectedGymId: currentGym.id,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to check this Program at your training location');
    }
  };

  const startAtCurrentGym = async () => {
    if (!program || !currentGym) return;
    try {
      setError('');
      const session = await flow.startProgramWorkoutAtCurrentGym({
        userId: DEFAULT_LOCAL_USER_ID,
        programId: program.id,
        expectedGymId: currentGym.id,
      });
      router.push({ pathname: '/active-workout' as any, params: { sessionId: session.id } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start this workout');
    }
  };

  if (!program) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <Text style={typography.body}>Program not found</Text>
    </View>;
  }

  const isReady = match?.status === 'fully_executable' || match?.status === 'executable_with_warnings';

  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
    <Text style={typography.h1}>{program.name}</Text>
    <Text style={typography.caption}>{program.exercises.length} exercises</Text>
    <Button title="Share Program" variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/social' as any, params: { programId: program.id } })} />

    {currentGym ? <Card>
      <Text style={typography.caption}>Train at</Text>
      <Text style={typography.h2}>{currentGym.name}</Text>
      <Text style={typography.caption}>GymFlow will check this Program against the equipment at your current training location.</Text>
      <Button title={`Train at ${currentGym.name}`} onPress={() => void matchAtCurrentGym()} style={{ marginTop: spacing.md }} />
      <Button title="Change training location" variant="secondary" onPress={() => router.push('/(tabs)/current-gym')} style={{ marginTop: spacing.sm }} />
    </Card> : <Card>
      <Text style={typography.h2}>{currentGymUnavailable ? 'Training location unavailable' : 'Choose where you’re training'}</Text>
      <Text style={typography.caption}>{currentGymUnavailable ? 'Your previous training location is no longer available. Choose another location.' : 'Choose a training location to see whether this Program can run there.'}</Text>
      <Button title="Choose where you’re training" onPress={() => router.push('/(tabs)/current-gym')} style={{ marginTop: spacing.md }} />
    </Card>}

    {error ? <Text style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Text> : null}
    {match && isReady ? <Card>
      <Text style={typography.h2}>Ready</Text>
      {match.status === 'executable_with_warnings' ? <Text style={typography.caption}>Some equipment details are limited, but this Program can run here.</Text> : <Text style={typography.caption}>This Program can run at {currentGym?.name}.</Text>}
      <Button title="Start workout" onPress={() => void startAtCurrentGym()} style={{ marginTop: spacing.md }} />
    </Card> : null}
    {match?.status === 'requires_adaptation' ? <Card>
      <Text style={typography.h2}>Ready with changes</Text>
      <Text style={typography.caption}>{match.summary.replaceable} exercise{match.summary.replaceable === 1 ? '' : 's'} can be adjusted for {currentGym?.name}.</Text>
      <Button title="Review changes" onPress={() => router.push({ pathname: '/replacement-review' as any, params: { programId: program.id } })} style={{ marginTop: spacing.md }} />
    </Card> : null}
    {match?.status === 'not_executable' ? <Card>
      <Text style={typography.h2}>Cannot run here</Text>
      <Text style={typography.caption}>{match.summary.unresolved} exercise{match.summary.unresolved === 1 ? '' : 's'} do not have a suitable option at {currentGym?.name}.</Text>
      <Button title="Choose another location" variant="secondary" onPress={() => router.push('/(tabs)/current-gym')} style={{ marginTop: spacing.md }} />
    </Card> : null}
  </ScrollView>;
}
