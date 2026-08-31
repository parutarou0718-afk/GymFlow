// ========================================
// GymFlow - Active Workout Screen (Full Screen Modal)
// ========================================

import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActiveWorkout } from "../src/components/session/ActiveWorkout";
import type { WorkoutSession } from "../src/modules/workout";

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    templateId?: string;
    sessionId?: string;
  }>();

  const handleFinish = (session: WorkoutSession) => {
    router.replace({
      pathname: "/workout-complete" as any,
      params: { sessionId: session.id },
    });
  };

  return (
    <ActiveWorkout
      templateId={params.sessionId ? undefined : params.templateId}
      existingSessionId={params.sessionId}
      onFinish={handleFinish}
      onDiscard={() => router.back()}
      onLeave={() => router.replace('/')}
    />
  );
}
