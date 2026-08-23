// ========================================
// GymFlow - Template Form Screen (Modal)
// ========================================

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../src/lib/theme';
import { TemplateForm } from '../src/components/template/TemplateForm';
import { useStores } from '../src/db/stores';
import { createProgramService, type Program } from '../src/modules/program';

export default function TemplateFormScreen() {
  const router = useRouter();
  const store = useStores();
  const programs = useMemo(() => createProgramService(store), [store]);
  const params = useLocalSearchParams<{ templateId?: string; templateData?: string }>();
  const [initial, setInitial] = useState<Program | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (params.templateData) {
        // Coming from copy
        setInitial(JSON.parse(params.templateData));
      } else if (params.templateId) {
        const t = await programs.getProgram(params.templateId);
        setInitial(t || undefined);
      }
      setLoading(false);
    };
    load();
  }, [params.templateId, params.templateData, programs]);

  const handleSave = async (template: Program) => {
    if (initial) {
      await programs.updateProgram(template);
    } else {
      await programs.createProgram(template);
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
