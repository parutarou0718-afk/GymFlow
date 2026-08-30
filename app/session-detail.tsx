// ========================================
// GymFlow - Session Detail Screen
// ========================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../src/lib/theme';
import { SessionDetail } from '../src/components/history';
import { Button } from '../src/components/ui';

export default function SessionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId: string }>();

  if (!params.sessionId) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: colors.textSecondary }}>Session not found</Text>
      </View>
    );
  }

  return (<View style={{ flex: 1 }}>
    <SessionDetail
      sessionId={params.sessionId}
      onBack={() => router.back()}
      onOpenGym={gymId => router.push({ pathname: '/gym-detail' as any, params: { gymId } })}
      onOpenProgram={programId => router.push({ pathname: '/program-detail' as any, params: { programId } })}
    />
    <View style={{ padding: 16 }}><Button title="Share Workout" onPress={() => router.push({ pathname: '/(tabs)/social' as any, params: { workoutSessionId: params.sessionId } })} /></View>
  </View>);
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
