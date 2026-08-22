// ========================================
// GymFlow - Active Workout Screen (Full Screen Modal)
// ========================================

import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActiveWorkout } from '../src/components/session/ActiveWorkout';

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ templateId?: string; sessionId?: string }>();

  const handleFinish = () => {
    router.back();
  };

  return (
    <ActiveWorkout
      templateId={params.sessionId ? undefined : params.templateId}
      existingSessionId={params.sessionId}
      onFinish={handleFinish}
      onLeave={() => router.replace('/')}
    />
  );
}
