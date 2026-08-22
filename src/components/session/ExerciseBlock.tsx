// ========================================
// GymFlow - Exercise Block Component
// Low-level: renders a single exercise's sets
// ========================================

import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../../lib/theme';
import { Card, Badge } from '../ui';
import type { SessionExercise } from '../../types';

interface ExerciseBlockProps {
  exercise: SessionExercise;
  onUpdateSet: (exId: string, setIdx: number, field: 'weight' | 'reps', value: number) => void;
  onToggleComplete: (exId: string, setIdx: number) => void;
  onAddSet: (exId: string) => void;
  onRemoveSet: (exId: string, setIdx: number) => void;
  onRemoveExercise: (exId: string) => void;
}

export function ExerciseBlock({ exercise, onUpdateSet, onToggleComplete, onAddSet, onRemoveSet, onRemoveExercise }: ExerciseBlockProps) {
  const completedCount = exercise.sets.filter(s => s.completed).length;

  return (
    <Card style={styles.exerciseBlock}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h3, { fontSize: 17 }]}>
            {exercise.exercise?.name || exercise.exerciseId}
          </Text>
          {exercise.exercise && (
            <Text style={[typography.caption, { marginTop: 2 }]}>
              {exercise.exercise.primaryMuscles.join(', ')}
            </Text>
          )}
        </View>
        <Badge
          label={`${completedCount}/${exercise.sets.length}`}
          variant={completedCount === exercise.sets.length ? 'completed' : 'active'}
        />
      </View>

      {/* Set Labels */}
      <View style={styles.setLabels}>
        <Text style={[typography.caption, { width: 50 }]}>Set</Text>
        <Text style={[typography.caption, { width: 80, textAlign: 'center' }]}>Weight</Text>
        <Text style={[typography.caption, { width: 60, textAlign: 'center' }]}>Reps</Text>
        <View style={{ width: 36 }} />
      </View>

      {exercise.sets.map((set, idx) => (
        <View key={idx} style={styles.setRow}>
          <Text style={[typography.bodySmall, { width: 50, color: colors.textTertiary }]}>
            {idx + 1}
          </Text>
          <TextInput
            style={[styles.setInput, set.completed && styles.setInputCompleted]}
            value={set.weight === 0 ? '' : String(set.weight)}
            onChangeText={t => onUpdateSet(exercise.id, idx, 'weight', parseFloat(t) || 0)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            editable={!set.completed}
          />
          <TextInput
            style={[styles.setInput, { marginLeft: spacing.sm }, set.completed && styles.setInputCompleted]}
            value={set.reps === 0 ? '' : String(set.reps)}
            onChangeText={t => onUpdateSet(exercise.id, idx, 'reps', parseInt(t) || 0)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            editable={!set.completed}
          />
          <TouchableOpacity
            style={[styles.checkButton, set.completed && styles.checkButtonDone]}
            onPress={() => onToggleComplete(exercise.id, idx)}
          >
            <Text style={[styles.checkMark, set.completed && styles.checkMarkDone]}>
              {set.completed ? '✓' : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemoveSet(exercise.id, idx)} style={{ marginLeft: spacing.xs }}><Text style={{ color: colors.danger, fontSize: 18 }}>×</Text></TouchableOpacity>
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
        <TouchableOpacity onPress={() => onAddSet(exercise.id)}><Text style={{ color: colors.primary, fontWeight: '700' }}>+ Add Set</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => onRemoveExercise(exercise.id)}><Text style={{ color: colors.danger, fontWeight: '700' }}>Remove Exercise</Text></TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  exerciseBlock: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  setLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  setInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
    height: 44,
  },
  setInputCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
    color: colors.primaryLight,
  },
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  checkButtonDone: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkMark: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  checkMarkDone: {
    color: '#fff',
  },
});
