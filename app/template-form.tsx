// ========================================
// GymFlow - Template Form Screen (Modal)
// ========================================

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../src/lib/theme';
import { TemplateForm } from '../src/components/template/TemplateForm';
import { useStores } from '../src/db/stores';
import type { WorkoutTemplate } from '../src/types';

export default function TemplateFormScreen() {
  const router = useRouter();
  const { templates } = useStores();
  const params = useLocalSearchParams<{ templateId?: string; templateData?: string }>();
  const [initial, setInitial] = useState<WorkoutTemplate | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (params.templateData) {
        // Coming from copy
        setInitial(JSON.parse(params.templateData));
      } else if (params.templateId) {
        const t = await templates.get(params.templateId);
        setInitial(t || undefined);
      }
      setLoading(false);
    };
    load();
  }, [params.templateId, params.templateData, templates]);

  const handleSave = async (template: WorkoutTemplate) => {
    if (initial) {
      await templates.update(template);
    } else {
      await templates.create(template);
    }
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <TemplateForm initial={initial} onSave={handleSave} onCancel={handleCancel} />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
