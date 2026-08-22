// ========================================
// GymFlow - Exercise Picker Component
// ========================================

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import { exerciseDB } from '../../lib/exercise-db';
import type { Exercise } from '../../types';

interface ExercisePickerProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  selectedIds?: string[];
}

export function ExercisePicker({ onSelect, onClose, selectedIds = [] }: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const muscleGroups = useMemo(() => exerciseDB.getMuscleGroups(), []);

  const exercises = useMemo(() => {
    let results = search
      ? exerciseDB.search(search)
      : selectedMuscle
        ? exerciseDB.getByMuscle(selectedMuscle)
        : exerciseDB.getAll();

    return results.filter(ex => !selectedIds.includes(ex.id));
  }, [search, selectedMuscle, selectedIds]);

  const renderMuscleChip = (muscle: string) => {
    const isActive = selectedMuscle === muscle;
    return (
      <TouchableOpacity
        key={muscle}
        style={[styles.chip, isActive && styles.chipActive]}
        onPress={() => setSelectedMuscle(isActive ? null : muscle)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
          {muscle.charAt(0).toUpperCase() + muscle.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderExercise = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => onSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseInfo}>
        <Text style={typography.body}>{item.name}</Text>
        <Text style={[typography.caption, { marginTop: 2 }]}>
          {item.equipment || 'Body weight'} · {item.mechanic || 'N/A'}
        </Text>
      </View>
      <View style={styles.muscleTags}>
        {item.primaryMuscles.slice(0, 2).map(m => (
          <View key={m} style={styles.muscleTag}>
            <Text style={styles.muscleTagText}>{m}</Text>
          </View>
        ))}
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 18 }}>+</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={{ color: colors.textMuted, fontSize: 16, marginRight: spacing.sm }}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textMuted}
          autoFocus
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Muscle Filter Chips */}
      {!search && (
        <FlatList
          horizontal
          data={muscleGroups}
          renderItem={({ item }) => renderMuscleChip(item)}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipList}
        />
      )}

      {/* Exercise List */}
      <FlatList
        data={exercises}
        renderItem={renderExercise}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={typography.bodySmall}>No exercises found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    margin: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  chipList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primary,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseInfo: {
    flex: 1,
  },
  muscleTags: {
    flexDirection: 'row',
    marginRight: spacing.md,
    gap: spacing.xs,
  },
  muscleTag: {
    backgroundColor: colors.bgTertiary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  muscleTagText: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  empty: {
    padding: spacing['4xl'],
    alignItems: 'center',
  },
});
