import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useStores } from '../src/db/stores';
import { createProgramService } from '../src/modules/program';
import { createSharingService } from '../src/modules/sharing';
import { createSocialService } from '../src/modules/social';
import { createUserService } from '../src/modules/user';
import { createWorkoutService } from '../src/modules/workout';
import { Card } from '../src/components/ui';
import { colors, spacing, typography } from '../src/lib/theme';
import { useCurrentUser } from '../src/modules/current-user';

export default function SharedWorkoutScreen() {
  const identity = useCurrentUser();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const store = useStores();
  const users = useMemo(() => createUserService(store), [store]);
  const sharing = useMemo(() => createSharingService({ users, programs: createProgramService(store), workouts: createWorkoutService(store), social: createSocialService(store) }), [store, users]);
  const [view, setView] = useState<Awaited<ReturnType<typeof sharing.getSharedWorkoutView>> | null>(null);
  const [message, setMessage] = useState('');
  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const user = identity.user;
      if (!user) return;
      setView(await sharing.getSharedWorkoutView({ viewerUserId: user.id, sessionId }));
    } catch { setMessage('This shared Workout is no longer available.'); }
  }, [identity.user, sessionId, sharing]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!view) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={typography.body}>{message || 'Loading shared Workout...'}</Text></View>;
  return <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg, paddingTop: spacing['4xl'] }}><Text style={typography.h1}>Shared Workout</Text><Card><Text style={typography.body}>{view.workout.exerciseCount} exercises</Text><Text style={typography.caption}>{view.workout.volume} volume · {view.workout.duration}s</Text></Card></View>;
}
