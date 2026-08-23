// ========================================
// GymFlow - Plans (Template Management)
// ========================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../src/lib/theme';
import { Card, Button, EmptyState, Badge } from '../../src/components/ui';
import { useStores } from '../../src/db/stores';
import { createProgramService, type Program } from '../../src/modules/program';

export default function PlansScreen() {
  const router = useRouter();
  const store = useStores();
  const programs = useMemo(() => createProgramService(store), [store]);
  const [templateList, setTemplateList] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const t = await programs.listPrograms();
    setTemplateList(t);
    setLoading(false);
  }, [programs]);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates])
  );

  const handleCreate = () => {
    router.push({ pathname: '/template-form' as any });
  };

  const handleEdit = (template: Program) => {
    router.push({ pathname: '/template-form' as any, params: { templateId: template.id } });
  };

  const handleStart = (template: Program) => {
    router.push({ pathname: '/active-workout' as any, params: { templateId: template.id } });
  };

  const handleDelete = (template: Program) => {
    Alert.alert(
      'Delete Template',
      `Delete "${template.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await programs.deleteProgram(template.id);
            loadTemplates();
          },
        },
      ]
    );
  };

  const handleCopy = (template: Program) => {
    const copy: Program = {
      ...template,
      id: `${Date.now()}-${Math.random()}`,
      name: `${template.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    router.push({ pathname: '/template-form' as any, params: { templateData: JSON.stringify(copy) } });
  };

  if (!loading && templateList.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[typography.h2, { paddingTop: spacing['4xl'] }]}>Plans</Text>
        </View>
        <EmptyState
          icon="📋"
          title="No Plans Yet"
          subtitle="Create a workout template to get started"
          action={{ label: 'Create Plan', onPress: handleCreate }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { paddingTop: spacing['4xl'] }]}>Plans</Text>
          <Text style={[typography.bodySmall, { marginTop: 2 }]}>
            {templateList.length} template{templateList.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={templateList}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card style={styles.templateCard}>
            <View style={styles.templateHeader}>
              <View style={{ flex: 1 }}>
                <Text style={typography.body}>{item.name}</Text>
                {item.description ? (
                  <Text style={[typography.caption, { marginTop: 2 }]}>{item.description}</Text>
                ) : null}
                <Text style={[typography.caption, { marginTop: 4 }]}>
                  {item.exercises.length} exercises · {item.exercises.reduce((s, e) => s + e.targetSets.length, 0)} total sets
                </Text>
              </View>
              <Badge
                label={`${item.exercises.length} ex`}
                variant="info"
              />
            </View>

            {/* Exercise preview */}
            <View style={styles.exercisePreview}>
              {item.exercises.slice(0, 4).map((ex, i) => (
                <View key={ex.id} style={styles.previewItem}>
                  <Text style={[typography.caption, { fontSize: 12 }]}>
                    {ex.exercise?.name || ex.exerciseId}
                  </Text>
                  <Text style={[typography.caption, { fontSize: 11, color: colors.textTertiary }]}>
                    {ex.targetSets.map(s => `${s.weight > 0 ? s.weight + 'kg × ' : ''}${s.reps}`).join(', ')}
                  </Text>
                </View>
              ))}
              {item.exercises.length > 4 && (
                <Text style={[typography.caption, { marginTop: spacing.xs }]}>
                  +{item.exercises.length - 4} more exercises
                </Text>
              )}
            </View>

            {/* Actions */}
            <View style={styles.templateActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => handleStart(item)}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleEdit(item)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '500', fontSize: 14 }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCopy(item)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '500', fontSize: 14 }}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDelete(item)}
              >
                <Text style={{ color: colors.danger, fontWeight: '500', fontSize: 14 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
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
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['4xl'] - 4,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  templateCard: {
    marginBottom: spacing.md,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  exercisePreview: {
    backgroundColor: colors.bgTertiary,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  templateActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.bgTertiary,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
});
