import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useStores } from '../src/db/stores';
import { createProgramService } from '../src/modules/program';
import { createGymContextService } from '../src/modules/gym-context';
import { createGymService } from '../src/modules/gym';
import { createMatchingService } from '../src/modules/matching';
import { createProgramMatchingService } from '../src/modules/program-matching';
import { createProgramAdaptationService } from '../src/modules/program-adaptation';
import { createInventoryService } from '../src/modules/gym-inventory';
import { createWorkoutService } from '../src/modules/workout';
import { createTrainingFlowService } from '../src/modules/training-flow';
import { createUserService, DEFAULT_LOCAL_USER_ID } from '../src/modules/user';
import { createExerciseService } from '../src/modules/exercise';
import { createEquipmentService } from '../src/modules/equipment';
import { createReplacementReviewService, type ReplacementReview } from '../src/modules/replacement-review';
import { presentReplacementIssue, presentReplacementReviewItem, type ReplacementReviewNames } from '../src/lib/replacement-review-presentation';
import { Button, Card } from '../src/components/ui';
import { colors, spacing, typography } from '../src/lib/theme';

const emptyNames: ReplacementReviewNames = { gymName: 'This Gym', exercises: {}, equipment: {} };

export default function ReplacementReviewScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const store = useStores();
  const programs = useMemo(() => createProgramService(store), [store]);
  const contexts = useMemo(() => createGymContextService(store), [store]);
  const gyms = useMemo(() => createGymService(store), [store]);
  const exerciseApi = useMemo(() => createExerciseService(store), [store]);
  const equipmentApi = useMemo(() => createEquipmentService(store), [store]);
  const flow = useMemo(() => createTrainingFlowService({ users: createUserService(store), gymContexts: contexts, gyms, inventory: createInventoryService(store), programs, programMatching: createProgramMatchingService({ programs, matching: createMatchingService(store) }), programAdaptation: createProgramAdaptationService({ programs, gyms }), workouts: createWorkoutService(store) }), [contexts, gyms, programs, store]);
  const reviewApi = useMemo(() => createReplacementReviewService(), []);
  const [review, setReview] = useState<ReplacementReview | null>(null);
  const [names, setNames] = useState<ReplacementReviewNames>(emptyNames);
  const [error, setError] = useState('');

  const resolveNames = async (nextReview: ReplacementReview) => {
    const entries = nextReview.matchResult.exercises.filter(entry => nextReview.items.some(item => item.programExerciseKey === entry.originalProgramExercise.id));
    const exerciseIds = new Set(nextReview.items.flatMap(item => [item.originalExerciseId, ...item.options.map(option => option.exerciseId)]));
    const equipmentIds = new Set(entries.flatMap(entry => entry.match.issues.flatMap(issue => issue.equipmentId ? [issue.equipmentId] : [])));
    const [gym, exerciseEntries, equipmentEntries] = await Promise.all([
      gyms.getGym(nextReview.gymId),
      Promise.all([...exerciseIds].map(async id => [id, (await exerciseApi.getExercise(id))?.name] as const)),
      Promise.all([...equipmentIds].map(async id => [id, (await equipmentApi.getEquipment(id))?.name] as const)),
    ]);
    setNames({ gymName: gym?.name ?? 'This Gym', exercises: Object.fromEntries(exerciseEntries.filter(([, name]) => Boolean(name))) as Record<string, string>, equipment: Object.fromEntries(equipmentEntries.filter(([, name]) => Boolean(name))) as Record<string, string> });
  };

  const load = useCallback(async () => {
    if (!programId) return;
    try {
      setError('');
      const [program, gymId] = await Promise.all([programs.getProgram(programId), contexts.getCurrentGym(DEFAULT_LOCAL_USER_ID)]);
      if (!program || !gymId) throw new Error('Current Gym and Program are required');
      const match = await flow.matchProgramForCurrentGym({ userId: DEFAULT_LOCAL_USER_ID, programId, expectedGymId: gymId });
      const nextReview = reviewApi.createReplacementReview({ matchResult: match, programUpdatedAt: program.updatedAt });
      setReview(nextReview);
      await resolveNames(nextReview);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load replacement choices'); }
  }, [contexts, equipmentApi, exerciseApi, flow, gyms, programId, programs, reviewApi]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const create = async () => {
    if (!review) return;
    try {
      setError('');
      const program = await flow.createAdaptedProgramFromReview({ userId: DEFAULT_LOCAL_USER_ID, expectedGymId: review.gymId, review });
      router.replace({ pathname: '/program-detail' as any, params: { programId: program.id } });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create adapted Program'); }
  };

  const statusCopy = review?.status === 'ready' ? 'Your changes are ready.' : review?.status === 'blocked' ? 'This Program cannot be adapted at this location.' : 'Choose a replacement for each exercise to continue.';

  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
    <Text style={typography.h1}>Make this Program work here</Text>
    <Text style={typography.caption}>Choose a replacement for each exercise that needs one.</Text>
    {error ? <Text style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Text> : null}
    {review?.items.map(item => {
      const entry = review.matchResult.exercises.find(value => value.originalProgramExercise.id === item.programExerciseKey);
      const presented = presentReplacementReviewItem(item, names);
      return <Card key={item.programExerciseKey}>
        <Text style={typography.h2}>{presented.originalExerciseName}</Text>
        {entry?.match.issues.map((issue, index) => <Text key={`${issue.code}-${index}`} style={[typography.caption, { marginTop: spacing.xs }]}>{presentReplacementIssue(issue, names)}</Text>)}
        {presented.options.map(option => <View key={option.exerciseId} style={{ marginTop: spacing.md }}>
          {option.isRecommended ? <Text style={{ color: colors.primary, fontWeight: '700' }}>Recommended</Text> : null}
          <Text style={typography.body}>{option.name}</Text>
          <Text style={typography.caption}>{option.reason}{option.hasAvailabilityWarning ? ' · Equipment details need confirmation' : ''}</Text>
          <Button title={presented.selectedExerciseId === option.exerciseId ? 'Selected' : 'Use this'} variant={presented.selectedExerciseId === option.exerciseId ? 'primary' : 'secondary'} onPress={() => setReview(reviewApi.selectReplacement({ review, programExerciseKey: item.programExerciseKey, replacementExerciseId: option.exerciseId }))} />
        </View>)}
        {item.decision.status === 'unresolved' ? <Text style={{ color: colors.danger, marginTop: spacing.md }}>No suitable replacement is available at this location.</Text> : null}
      </Card>;
    })}
    {review ? <View style={{ marginTop: spacing.md }}><Text style={typography.caption}>{statusCopy}</Text><Button title="Create Adapted Program" disabled={review.status !== 'ready'} onPress={() => void create()} /></View> : null}
  </ScrollView>;
}
