// ========================================
// GymFlow - Active Workout Session
// Thin glue layer: wires engine + components
// ========================================

import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../lib/theme';
import { useWorkoutEngine } from '../../hooks/useWorkoutEngine';
import { ExerciseBlock } from './ExerciseBlock';
import { PauseOverlay } from './PauseOverlay';
import type { WorkoutTemplate } from '../../types';

interface ActiveWorkoutProps {
  template?: WorkoutTemplate;
  existingSessionId?: string;
  onFinish: () => void;
}

export function ActiveWorkout({ template, existingSessionId, onFinish }: ActiveWorkoutProps) {
  const engine = useWorkoutEngine({ template, existingSessionId, onFinish });

  if (!engine.session) return null;

  // Paused state → full overlay
  if (engine.isPaused) {
    return (
      <PauseOverlay
        elapsed={engine.elapsed}
        saving={engine.saving}
        onResume={engine.handleResume}
        onFinish={engine.handleFinish}
        formatTime={engine.formatTime}
      />
    );
  }

  return (
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
          <TouchableOpacity onPress={engine.handlePause} style={styles.iconButton}>
            <Text style={{ fontSize: 22 }}>⏸</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={engine.handleFinish} style={styles.finishButton}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Finish</Text>
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
          />
        )}
        contentContainerStyle={styles.list}
      />
    </View>
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
});
