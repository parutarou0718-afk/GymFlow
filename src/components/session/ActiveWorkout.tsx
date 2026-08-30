// ========================================
// GymFlow - Active Workout Session
// Thin glue layer: wires engine + components
// ========================================

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Modal, Alert } from 'react-native';
import { colors, spacing, radius, typography } from '../../lib/theme';
import { useWorkoutEngine } from '../../hooks/useWorkoutEngine';
import { ExerciseBlock } from './ExerciseBlock';
import { PauseOverlay } from './PauseOverlay';
import { ExercisePicker } from '../template/ExercisePicker';
import { useStores } from '../../db/stores';
import { createWorkoutReplacementService, type WorkoutReplacementOptions } from '../../modules/workout-replacement';
import { createCandidateResolutionService } from '../../modules/candidate-resolution';
import { createMatchingService } from '../../modules/matching';
import { createExerciseService } from '../../modules/exercise';
import { createWorkoutService, type WorkoutReplacementReason } from '../../modules/workout';

interface ActiveWorkoutProps {
  templateId?: string;
  existingSessionId?: string;
  onFinish: () => void;
  onLeave: () => void;
}

export function ActiveWorkout({ templateId, existingSessionId, onFinish, onLeave }: ActiveWorkoutProps) {
  const engine = useWorkoutEngine({ templateId, existingSessionId, onFinish });
  const [pickingExercise, setPickingExercise] = useState(false);
  const [confirmation, setConfirmation] = useState<'finish' | 'discard' | null>(null);
  const store = useStores();
  const workoutApi = useMemo(() => createWorkoutService(store), [store]);
  const replacementApi = useMemo(() => createWorkoutReplacementService({ workouts: workoutApi, candidates: createCandidateResolutionService(store), matching: createMatchingService(store), exercises: createExerciseService(store) }), [store, workoutApi]);
  const [replacementOptions, setReplacementOptions] = useState<WorkoutReplacementOptions | null>(null);
  const [replacementExerciseId, setReplacementExerciseId] = useState<string | null>(null);
  const [replacementReason, setReplacementReason] = useState<WorkoutReplacementReason | null>(null);
  const [replacing, setReplacing] = useState(false);
  const openReplacement = async (sessionExerciseId: string) => {
    if (!engine.session || engine.saving) return;
    try {
      const options = await replacementApi.getWorkoutReplacementOptions({ sessionId: engine.session.id, sessionExerciseId });
      setReplacementOptions(options); setReplacementExerciseId(null); setReplacementReason(null);
    } catch (error) { Alert.alert('Replace Exercise', error instanceof Error ? error.message : 'Unable to load replacements'); }
  };
  const confirmReplacement = async () => {
    if (!replacementOptions || !replacementExerciseId || !replacementReason || replacing) return;
    setReplacing(true);
    try {
      await replacementApi.replaceExercise({ sessionId: replacementOptions.sessionId, sessionExerciseId: replacementOptions.sessionExerciseId, replacementExerciseId, reason: replacementReason, expectedCompletedSetCount: replacementOptions.completedSetCount });
      await engine.refresh();
      setReplacementOptions(null);
    } catch (error) { Alert.alert('Replace Exercise', error instanceof Error ? error.message : 'Replacement could not be applied'); } finally { setReplacing(false); }
  };
  const requestFinishWorkout = () => {
    if (engine.saving) return;
    setConfirmation('finish');
  };
  const requestDiscardWorkout = () => { if (!engine.saving) setConfirmation('discard'); };
  const confirmationDialog = <Modal transparent visible={confirmation !== null} animationType="fade" onRequestClose={() => setConfirmation(null)}><View style={styles.confirmBackdrop}><View style={styles.confirmCard}><Text style={typography.h2}>{confirmation === 'finish' ? 'Finish Workout' : 'Discard Workout'}</Text><Text style={[typography.bodySmall, { marginTop: spacing.sm }]}>{confirmation === 'finish' ? 'Complete this workout?' : 'Discard this workout? It will not appear in history.'}</Text><View style={styles.confirmActions}><TouchableOpacity disabled={engine.saving} onPress={() => setConfirmation(null)}><Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={engine.saving} onPress={() => { const action = confirmation; setConfirmation(null); if (action === 'finish') void engine.handleFinish(); else void engine.handleDiscard(); }}><Text style={{ color: confirmation === 'finish' ? colors.primary : colors.danger, fontWeight: '700' }}>{confirmation === 'finish' ? 'Finish' : 'Discard'}</Text></TouchableOpacity></View></View></View></Modal>;
  const replacementDialog = <Modal transparent visible={replacementOptions !== null} animationType="slide" onRequestClose={() => setReplacementOptions(null)}><View style={styles.confirmBackdrop}><View style={styles.confirmCard}><Text style={typography.h2}>Replace Exercise</Text>{replacementOptions?.gymValidation === 'not_available' ? <Text style={[typography.caption, { color: colors.textSecondary }]}>Suggestions are not verified against gym equipment.</Text> : null}<Text style={[typography.caption, { marginTop: spacing.sm }]}>Reason</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{(['equipment_occupied', 'equipment_unavailable', 'prefer_different_exercise', 'other'] as WorkoutReplacementReason[]).map(reason => <TouchableOpacity disabled={replacing} key={reason} onPress={() => setReplacementReason(reason)}><Text style={{ color: replacementReason === reason ? colors.primary : colors.textSecondary }}>{reason.replaceAll('_', ' ')}</Text></TouchableOpacity>)}</View><Text style={[typography.caption, { marginTop: spacing.md }]}>Choose a replacement</Text>{replacementOptions?.options.map((option, index) => <TouchableOpacity disabled={replacing} key={option.exerciseId} onPress={() => setReplacementExerciseId(option.exerciseId)} style={{ marginTop: spacing.sm }}><Text style={{ color: replacementExerciseId === option.exerciseId ? colors.primary : colors.text }}>{index === 0 ? 'Recommended · ' : ''}{option.name}{option.gymStatus === 'executable_with_warning' ? ' · warning' : ''}</Text></TouchableOpacity>)}{replacementOptions?.options.length === 0 ? <Text style={{ color: colors.danger }}>No executable replacements available.</Text> : null}<Text style={[typography.caption, { marginTop: spacing.md }]}>Completed sets stay recorded. Remaining sets keep reps and reset weight.</Text><View style={styles.confirmActions}><TouchableOpacity disabled={replacing} onPress={() => setReplacementOptions(null)}><Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text></TouchableOpacity><TouchableOpacity disabled={replacing || !replacementExerciseId || !replacementReason} onPress={() => void confirmReplacement()}><Text style={{ color: colors.primary, fontWeight: '700' }}>{replacing ? 'Replacing…' : 'Confirm Replacement'}</Text></TouchableOpacity></View></View></View></Modal>;

  if (!engine.session) return null;

  if (pickingExercise) {
    return <ExercisePicker selectedIds={engine.session.exercises.map(exercise => exercise.exerciseId)} onSelect={async exercise => { await engine.addExercise(exercise); setPickingExercise(false); }} onClose={() => setPickingExercise(false)} />;
  }

  // Paused state → full overlay
  if (engine.isPaused) {
    return (
      <>
      <PauseOverlay
        elapsed={engine.elapsed}
        saving={engine.saving}
        onResume={engine.handleResume}
        onFinish={requestFinishWorkout}
        onLeave={onLeave}
        formatTime={engine.formatTime}
      />
      {confirmationDialog}
      </>
    );
  }

  return (
    <>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {engine.session.templateName || 'Workout'}
          </Text>
          <Text style={[typography.metric, { color: colors.primary }]}>
            {engine.formatTime(engine.elapsed)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
            <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={engine.handlePause} style={styles.iconButton}>
            <Text style={{ fontSize: 22 }}>⏸</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={engine.saving} onPress={requestFinishWorkout} style={styles.finishButton}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Finish</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={engine.saving} onPress={requestDiscardWorkout}>
            <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>Discard</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Exercise List */}
      <FlatList
        data={engine.session.exercises}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ExerciseBlock
            exercise={item}
            onUpdateSet={engine.handleSetUpdate}
            onToggleComplete={engine.toggleSetComplete}
            onAddSet={engine.addSet}
            onRemoveSet={engine.removeSet}
            onRemoveExercise={id => {
              const exercise = engine.session?.exercises.find(item => item.id === id);
              if (!exercise?.sets.some(set => set.completed || set.weight > 0 || set.reps > 0)) { void engine.removeExercise(id); return; }
              Alert.alert('Remove Exercise', 'This exercise has recorded sets. Remove it?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void engine.removeExercise(id) }]);
            }}
            onReplaceExercise={id => void openReplacement(id)}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={typography.bodySmall}>No exercises yet. Add one to start your quick workout.</Text></View>}
        ListFooterComponent={<TouchableOpacity style={styles.addExercise} onPress={() => setPickingExercise(true)}><Text style={{ color: colors.primary, fontWeight: '700' }}>+ Add Exercise</Text></TouchableOpacity>}
      />
    </View>
    {confirmationDialog}
    {replacementDialog}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bgTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  finishButton: {
    paddingHorizontal: spacing.lg,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  leaveButton: {
    paddingHorizontal: spacing.md,
    height: 44,
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: spacing['4xl'] },
  addExercise: { alignItems: 'center', padding: spacing.lg, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.md },
  confirmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  confirmCard: { width: '100%', maxWidth: 360, backgroundColor: colors.bgSecondary, borderRadius: radius.lg, padding: spacing.xl },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xl, marginTop: spacing.xl },
});
