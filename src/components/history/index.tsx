// ========================================
// GymFlow - Workout History Components
// ========================================

import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import { Card, Badge, EmptyState, Divider, Metric } from '../ui';
import { useStores } from '../../db/stores';
import { createWorkoutService } from '../../modules/workout';
import { formatDate, formatShortDate, formatDuration, formatVolume, calculateVolume } from '../../lib/utils';
import type { WorkoutSession } from '../../modules/workout';
import { exerciseDB } from '../../lib/exercise-db';

interface HistoryListProps {
  sessions: WorkoutSession[];
  onSelectSession: (sessionId: string) => void;
}

export function HistoryList({ sessions, onSelectSession }: HistoryListProps) {
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
}

function HistoryCard({ session, onPress }: HistoryCardProps) {
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
}

export function SessionDetail({ sessionId, onBack }: SessionDetailProps) {
  const store = useStores();
  const workoutService = useMemo(() => createWorkoutService(store), [store]);
  const [session, setSession] = React.useState<WorkoutSession | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      const s = await workoutService.getWorkoutHistoryDetail(sessionId);
      if (s) {
        // Enrich with exercise data
        s.exercises = s.exercises.map(ex => ({
          ...ex,
          exercise: ex.exercise || exerciseDB.getById(ex.exerciseId),
        }));
        setSession(s);
      }
      setLoading(false);
    };
    load();
  }, [sessionId, workoutService]);

  if (loading) return null;
  if (!session) return <Text style={{ padding: spacing.lg, color: colors.textSecondary }}>Session not found</Text>;

  const totalVolume = session.totalVolume || calculateVolume(session.exercises.flatMap(e => e.sets));
  const duration = session.duration || 0;

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
});
