// ========================================
// GymFlow - Active Workout Screen (Full Screen Modal)
// ========================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, spacing } from '../src/lib/theme';
import { ActiveWorkout } from '../src/components/session/ActiveWorkout';
import { useStores } from '../src/db/stores';
import type { WorkoutTemplate } from '../src/types';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const { templates } = useStores();
  const params = useLocalSearchParams<{ templateId?: string; sessionId?: string }>();
  const [template, setTemplate] = useState<WorkoutTemplate | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (params.templateId) {
        const t = await templates.get(params.templateId);
        setTemplate(t || undefined);
      }
      setLoading(false);
    };
    init();
  }, [params.templateId, templates]);

  const handleFinish = () => {
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
    <ActiveWorkout
      template={params.sessionId ? undefined : template}
      existingSessionId={params.sessionId}
      onFinish={handleFinish}
    />
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
