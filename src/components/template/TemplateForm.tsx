// ========================================
// GymFlow - Template Form Component
// Build a workout template (plan)
// ========================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import { Button, Card, Divider } from '../ui';
import { ExercisePicker } from './ExercisePicker';
import { generateId } from '../../lib/utils';
import type { WorkoutTemplate, TemplateExercise, TargetSet, Exercise } from '../../types';

interface TemplateFormProps {
  initial?: WorkoutTemplate;
  onSave: (template: WorkoutTemplate) => void;
  onCancel: () => void;
}

export function TemplateForm({ initial, onSave, onCancel }: TemplateFormProps) {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [exercises, setExercises] = useState<TemplateExercise[]>(initial?.exercises || []);
  const [showPicker, setShowPicker] = useState(false);
  const [editingExercise, setEditingExercise] = useState<string | null>(null); // id of exercise being edited

  const addExercise = useCallback((exercise: Exercise) => {
    const newEx: TemplateExercise = {
      id: generateId(),
      exerciseId: exercise.id,
      exercise,
      order: exercises.length,
      targetSets: [
        { setIndex: 0, reps: 10, weight: 0, unit: 'kg' },
        { setIndex: 1, reps: 10, weight: 0, unit: 'kg' },
        { setIndex: 2, reps: 10, weight: 0, unit: 'kg' },
      ],
    };
    setExercises(prev => [...prev, newEx]);
    setShowPicker(false);
  }, [exercises]);

  const removeExercise = useCallback((id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  }, []);

  const updateTargetSet = useCallback((
    exerciseId: string,
    setIndex: number,
    field: keyof TargetSet,
    value: number
  ) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      return {
        ...ex,
        targetSets: ex.targetSets.map((s, i) =>
          i === setIndex ? { ...s, [field]: value } : s
        ),
      };
    }));
  }, []);

  const addSetToExercise = useCallback((exerciseId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId) return ex;
      const lastSet = ex.targetSets[ex.targetSets.length - 1];
      return {
        ...ex,
        targetSets: [
          ...ex.targetSets,
          {
            setIndex: ex.targetSets.length,
            reps: lastSet?.reps || 10,
            weight: lastSet?.weight || 0,
            unit: lastSet?.unit || 'kg',
          },
        ],
      };
    }));
  }, []);

  const removeSetFromExercise = useCallback((exerciseId: string) => {
    setExercises(prev => prev.map(ex => {
      if (ex.id !== exerciseId || ex.targetSets.length <= 1) return ex;
      return {
        ...ex,
        targetSets: ex.targetSets.slice(0, -1),
      };
    }));
  }, []);

  const canSave = name.trim().length > 0 && exercises.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    const template: WorkoutTemplate = {
      id: initial?.id || generateId(),
      name: name.trim(),
      description: description.trim(),
      exercises,
      createdAt: initial?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSave(template);
  };

  const renderSetRow = (exId: string, targetSet: TargetSet, index: number) => (
    <View key={index} style={styles.setRow}>
      <Text style={[typography.bodySmall, { width: 40 }]}>Set {index + 1}</Text>
      <View style={styles.setInputGroup}>
        <TextInput
          style={styles.setInput}
          value={targetSet.weight === 0 ? '' : String(targetSet.weight)}
          onChangeText={(t) => updateTargetSet(exId, index, 'weight', parseFloat(t) || 0)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[typography.caption, { marginHorizontal: 4 }]}>kg ×</Text>
        <TextInput
          style={styles.setInput}
          value={targetSet.reps === 0 ? '' : String(targetSet.reps)}
          onChangeText={(t) => updateTargetSet(exId, index, 'reps', parseInt(t) || 0)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textMuted}
        />
        <Text style={[typography.caption, { marginHorizontal: 4 }]}>reps</Text>
      </View>
    </View>
  );

  const renderExerciseItem = ({ item }: { item: TemplateExercise }) => {
    return (
      <Card style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
          <View style={{ flex: 1 }}>
            <Text style={typography.body}>{item.exercise?.name || item.exerciseId}</Text>
            {item.exercise && (
              <Text style={[typography.caption, { marginTop: 2 }]}>
                {item.exercise.primaryMuscles.join(', ')}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => removeExercise(item.id)}>
            <Text style={{ color: colors.danger, fontSize: 14 }}>Remove</Text>
          </TouchableOpacity>
        </View>

        {item.targetSets.map((s, i) => renderSetRow(item.id, s, i))}

        <View style={styles.setActions}>
          <TouchableOpacity onPress={() => addSetToExercise(item.id)}>
            <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>+ Add Set</Text>
          </TouchableOpacity>
          {item.targetSets.length > 1 && (
            <TouchableOpacity onPress={() => removeSetFromExercise(item.id)} style={{ marginLeft: spacing.lg }}>
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>- Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={typography.h3}>{initial ? 'Edit Template' : 'New Template'}</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={exercises}
        renderItem={renderExerciseItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={styles.formFields}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Template name (e.g. Push Day)"
              placeholderTextColor={colors.textMuted}
            />
            <TextInput
              style={styles.descInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <Button
              title="+ Add Exercise"
              onPress={() => setShowPicker(true)}
              variant="secondary"
              size="sm"
              style={{ marginBottom: spacing.lg }}
            />
          </View>
        }
        ListFooterComponent={
          exercises.length > 0 ? (
            <View style={{ padding: spacing.lg }}>
              <Button
                title="+ Add Another Exercise"
                onPress={() => setShowPicker(true)}
                variant="ghost"
                size="sm"
              />
            </View>
          ) : null
        }
        contentContainerStyle={styles.list}
      />

      {/* Exercise Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={typography.h3}>Choose Exercise</Text>
            <View style={{ width: 60 }} />
          </View>
          <ExercisePicker
            onSelect={addExercise}
            onClose={() => setShowPicker(false)}
            selectedIds={exercises.map(e => e.exerciseId)}
          />
        </View>
      </Modal>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  saveButton: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  formFields: {
    padding: spacing.lg,
  },
  nameInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  descInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.textSecondary,
    fontSize: 15,
    marginBottom: spacing.lg,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  list: {
    paddingBottom: spacing['4xl'],
  },
  exerciseCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  setInputGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  setInput: {
    backgroundColor: colors.bgInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    width: 60,
    textAlign: 'center',
  },
  setActions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
