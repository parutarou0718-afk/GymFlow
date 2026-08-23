// ========================================
// GymFlow - Home Dashboard
// ========================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../src/lib/theme';
import { Card, Button, Metric, EmptyState, SectionHeader } from '../../src/components/ui';
import { formatDuration, formatVolume, formatShortDate } from '../../src/lib/utils';
import { useStores } from '../../src/db/stores';
import type { WorkoutSession, WorkoutTemplate } from '../../src/types';
import { createWorkoutService } from '../../src/modules/workout';
import { createProgramService } from '../../src/modules/program';

export default function HomeScreen() {
  const router = useRouter();
  const store = useStores();
  const workoutApi = useMemo(() => createWorkoutService(store), [store]);
  const programApi = useMemo(() => createProgramService(store), [store]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [recentTemplates, setRecentTemplates] = useState<WorkoutTemplate[]>([]);
  const [stats, setStats] = useState({ workouts: 0, volume: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [active, templs, workoutStats] = await Promise.all([
      workoutApi.getActiveWorkouts(),
      programApi.listPrograms(),
      workoutApi.getWorkoutStats(),
    ]);
    setActiveSession(active[0] ?? null);
    setRecentTemplates(templs.slice(0, 5));
    setStats(workoutStats);
  }, [programApi, workoutApi]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleStartWorkout = (template?: WorkoutTemplate) => {
    if (template) {
      router.push({ pathname: '/active-workout' as any, params: { templateId: template.id } });
    } else {
      router.push({ pathname: '/active-workout' as any });
    }
  };

  const handleResumeWorkout = () => {
    if (activeSession) {
      router.push({ pathname: '/active-workout' as any, params: { sessionId: activeSession.id } });
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>GymFlow</Text>
          <Text style={[typography.bodySmall, { marginTop: 2 }]}>
            {stats.workouts > 0 ? `${stats.workouts} workouts completed` : 'Ready to train'}
          </Text>
        </View>
      </View>

      {/* Active Session Banner */}
      {activeSession && (
        <Card style={styles.activeBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={[typography.body, { color: colors.primary, fontWeight: '600' }]}>
                ▶ Active Workout
              </Text>
              <Text style={[typography.bodySmall, { marginTop: 2 }]}>
                {activeSession.templateName || 'Quick Workout'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResumeWorkout}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Resume</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Quick Start */}
      <View style={styles.quickStart}>
        <Button
          title="Start Quick Workout"
          onPress={() => handleStartWorkout()}
          variant="primary"
          size="lg"
          style={{ width: '100%' }}
        />
      </View>

      {/* Stats */}
      {stats.workouts > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[typography.metric, { color: colors.primary }]}>{stats.workouts}</Text>
            <Text style={typography.caption}>Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={typography.metric}>{formatVolume(stats.volume)}</Text>
            <Text style={typography.caption}>Total Volume</Text>
          </View>
        </View>
      )}

      {/* Recent Templates */}
      {recentTemplates.length > 0 && (
        <>
          <SectionHeader
            title="Templates"
            action={{ label: 'See All', onPress: () => router.push('/(tabs)/plans') }}
          />
          {recentTemplates.map(template => (
            <Card
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleStartWorkout(template)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={typography.body}>{template.name}</Text>
                  <Text style={[typography.caption, { marginTop: 2 }]}>
                    {template.exercises.length} exercises
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.startSmall}
                  onPress={() => handleStartWorkout(template)}
                >
                  <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Start</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Empty State */}
      {!activeSession && recentTemplates.length === 0 && stats.workouts === 0 && (
        <View style={styles.emptySection}>
          <EmptyState
            icon="🏋️"
            title="Welcome to GymFlow"
            subtitle="Create your first training plan or start a quick workout"
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: spacing['4xl'],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.lg,
  },
  greeting: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  activeBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryBg,
    borderColor: colors.primaryDark,
  },
  resumeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  quickStart: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  templateCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  startSmall: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
  },
  emptySection: {
    marginTop: spacing['4xl'],
  },
});
