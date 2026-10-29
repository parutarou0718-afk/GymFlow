// ========================================
// GymFlow - Workout History Components
// ========================================

import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import { Card, Badge, EmptyState, Divider, Metric } from '../ui';
import { useStores } from '../../db/stores';
import { createWorkoutService } from '../../modules/workout';
import { createGymService } from '../../modules/gym';
import { useCurrentUser } from '../../modules/current-user';
import { createProgramInputFromCompletedWorkout, createProgramService } from '../../modules/program';
import { formatDate, formatShortDate, formatDuration, formatVolume, calculateVolume } from '../../lib/utils';
import type { WorkoutSession } from '../../modules/workout';
import { exerciseDB } from '../../lib/exercise-db';

interface HistoryListProps {
  sessions: WorkoutSession[];
  onSelectSession: (sessionId: string) => void;
}

export function HistoryList({ sessions, onSelectSession }: HistoryListProps) {
  const store = useStores(); const gyms = useMemo(() => createGymService(store), [store]); const [gymNames, setGymNames] = useState<Record<string, string>>({});
  useEffect(() => { void Promise.all([...new Set(sessions.map(x => x.gymId).filter(Boolean) as string[])].map(async id => [id, (await gyms.getGym(id))?.name ?? 'Not available'] as const)).then(items => setGymNames(Object.fromEntries(items))); }, [gyms, sessions]);
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon="💪"
        title="No Workouts Yet"
        subtitle="Complete your first workout to see it here"
      />
    );
  }

  // Group by date
  const grouped = sessions.reduce<Record<string, WorkoutSession[]>>((acc, s) => {
    const key = formatShortDate(s.startedAt);
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const sections = Object.entries(grouped);

  return (
    <FlatList
      data={sections}
      keyExtractor={([date]) => date}
      renderItem={({ item: [date, items] }) => (
        <View>
          <Text style={[typography.label, { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm }]}>
            {date}
          </Text>
          {items.map(session => (
            <HistoryCard
              key={session.id}
              session={session}
              gymName={session.gymId ? gymNames[session.gymId] : 'No Gym'}
              onPress={() => onSelectSession(session.id)}
            />
          ))}
        </View>
      )}
      contentContainerStyle={{ paddingBottom: spacing['4xl'] }}
    />
  );
}

// ---- History Card ----
interface HistoryCardProps {
  session: WorkoutSession;
  onPress: () => void;
  gymName: string;
}

function HistoryCard({ session, onPress, gymName }: HistoryCardProps) {
  const totalVolume = session.totalVolume || calculateVolume(session.exercises.flatMap(e => e.sets));
  const duration = session.duration || 0;
  const exerciseCount = session.exercises.length;

  return (
    <Card style={styles.historyCard} onPress={onPress}>
      <View style={styles.historyHeader}>
        <View style={{ flex: 1 }}>
          <Text style={typography.body}>
            {session.templateName || `Workout ${formatDate(session.startedAt)}`}
          </Text>
          <Text style={[typography.caption, { marginTop: 2 }]}>
            {formatDate(session.startedAt)}
          </Text>
          <Text style={typography.caption}>{gymName}</Text>
        </View>
        <TouchableOpacity onPress={onPress}>
          <Text style={{ color: colors.textMuted, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      </View>
      <Divider />
      <View style={styles.historyStats}>
        <View style={styles.stat}>
          <Text style={[typography.metric, { fontSize: 18, color: colors.primary }]}>
            {formatVolume(totalVolume)}
          </Text>
          <Text style={typography.caption}>Volume</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[typography.metric, { fontSize: 18 }]}>
            {formatDuration(duration)}
          </Text>
          <Text style={typography.caption}>Duration</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[typography.metric, { fontSize: 18 }]}>
            {exerciseCount}
          </Text>
          <Text style={typography.caption}>Exercises</Text>
        </View>
      </View>
    </Card>
  );
}

// ---- Session Detail View ----
interface SessionDetailProps {
  sessionId: string;
  onBack: () => void;
  onOpenGym?: (gymId: string) => void;
  onOpenProgram?: (programId: string) => void;
}

export function SessionDetail({ sessionId, onBack, onOpenGym, onOpenProgram }: SessionDetailProps) {
  const { user } = useCurrentUser();
  const store = useStores();
  const workoutService = useMemo(() => createWorkoutService(store), [store]);
  const programService = useMemo(() => createProgramService(store), [store]);
  const gymService = useMemo(() => createGymService(store), [store]);
  const [session, setSession] = React.useState<WorkoutSession | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showSaveProgram, setShowSaveProgram] = React.useState(false);
  const [programName, setProgramName] = React.useState('');
  const [savingProgram, setSavingProgram] = React.useState(false);
  const [gymName, setGymName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const s = user ? await workoutService.getWorkoutHistoryDetailForOwner(user.id, sessionId) : null;
      if (s) {
        // Enrich with exercise data
        s.exercises = s.exercises.map(ex => ({
          ...ex,
          exercise: ex.exercise || exerciseDB.getById(ex.exerciseId),
        }));
        setSession(s);
        if (s.gymId) setGymName((await gymService.getGym(s.gymId))?.name ?? null);
      }
      setLoading(false);
    };
    load();
  }, [gymService, sessionId, user, workoutService]);

  if (loading) return null;
  if (!session) return <Text style={{ padding: spacing.lg, color: colors.textSecondary }}>Session not found</Text>;

  const totalVolume = session.totalVolume || calculateVolume(session.exercises.flatMap(e => e.sets));
  const duration = session.duration || 0;
  const requestSaveAsProgram = () => {
    setProgramName(session.templateName || `Workout ${formatDate(session.startedAt)}`);
    setShowSaveProgram(true);
  };
  const saveAsProgram = async () => {
    if (savingProgram || !programName.trim()) return;
    setSavingProgram(true);
    try {
      if (!user) return;
      await programService.createProgramForOwner(user.id, createProgramInputFromCompletedWorkout(session, programName));
      setShowSaveProgram(false);
    } finally {
      setSavingProgram(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={typography.h3}>
          {session.templateName || 'Workout'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Metric label="Volume" value={formatVolume(totalVolume)} />
        <Metric label="Duration" value={formatDuration(duration)} />
        <Metric label="Exercises" value={String(session.exercises.length)} />
      </View>

      <Text style={[typography.caption, { textAlign: 'center', marginBottom: spacing.lg }]}>
        {formatDate(session.startedAt)}
      </Text>

      {session.gymId ? <TouchableOpacity onPress={() => onOpenGym?.(session.gymId!)}><Text style={[typography.caption, { textAlign: 'center', marginBottom: spacing.sm, color: colors.primary }]}>Gym: {gymName ?? 'Not available'}</Text></TouchableOpacity> : <Text style={[typography.caption, { textAlign: 'center', marginBottom: spacing.sm }]}>No Gym</Text>}
      {session.templateId ? <TouchableOpacity onPress={() => onOpenProgram?.(session.templateId!)}><Text style={[typography.caption, { textAlign: 'center', marginBottom: spacing.sm, color: colors.primary }]}>Source Program: {session.templateName ?? 'Not available'}</Text></TouchableOpacity> : null}

      {session.status === 'completed' && (
        <TouchableOpacity style={styles.saveProgramButton} onPress={requestSaveAsProgram}>
          <Text style={styles.saveProgramButtonText}>Save as Program</Text>
        </TouchableOpacity>
      )}

      {/* Exercises */}
      <FlatList
        data={session.exercises}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.detailExercise}>
            <Text style={[typography.body, { fontWeight: '600' }]}>
              {item.exercise?.name || item.exerciseId}
            </Text>
            {item.sets.filter(s => s.completed).map((set, idx) => (
              <Text key={idx} style={[typography.bodySmall, { marginLeft: spacing.lg, marginTop: 2 }]}>
                {set.weight}kg × {set.reps}
              </Text>
            ))}
          </View>
        )}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}
      />

      <Modal
        transparent
        visible={showSaveProgram}
        animationType="fade"
        onRequestClose={() => !savingProgram && setShowSaveProgram(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={typography.h3}>Save as Program</Text>
            <Text style={[typography.bodySmall, { marginTop: spacing.sm }]}>Create an independent copy of this completed workout.</Text>
            <TextInput
              style={styles.programNameInput}
              value={programName}
              onChangeText={setProgramName}
              editable={!savingProgram}
              placeholder="Program name"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity disabled={savingProgram} onPress={() => setShowSaveProgram(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={savingProgram || !programName.trim()} onPress={() => void saveAsProgram()}>
                <Text style={[styles.saveText, (!programName.trim() || savingProgram) && styles.disabledText]}>
                  {savingProgram ? 'Saving…' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  historyCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },

  // Detail
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 60,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    backgroundColor: colors.bgSecondary,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  detailExercise: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  saveProgramButton: {
    alignSelf: 'center',
    backgroundColor: colors.bgTertiary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  saveProgramButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  programNameInput: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveText: {
    color: colors.primary,
    fontWeight: '700',
  },
  disabledText: {
    opacity: 0.4,
  },
});
