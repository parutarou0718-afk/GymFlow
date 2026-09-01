// ========================================
// GymFlow - History Screen
// ========================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../src/lib/theme';
import { HistoryList } from '../../src/components/history';
import { useStores } from '../../src/db/stores';
import { createWorkoutService } from '../../src/modules/workout';
import type { WorkoutSession } from '../../src/modules/workout';
import { useCurrentUser } from '../../src/modules/current-user';

export default function HistoryScreen() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const store = useStores();
  const workoutService = useMemo(() => createWorkoutService(store), [store]);
  const [sessionList, setSessionList] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const s = user ? await workoutService.getWorkoutHistoryForOwner(user.id) : [];
    setSessionList(s);
    setLoading(false);
  }, [user, workoutService]);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [loadSessions])
  );

  const handleSelectSession = (sessionId: string) => {
    router.push({ pathname: '/session-detail' as any, params: { sessionId } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {sessionList.length > 0 && (
          <Text style={[typography.bodySmall, { marginTop: 2 }]}>
            {sessionList.length} workout{sessionList.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      <HistoryList sessions={sessionList} onSelectSession={handleSelectSession} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },
});
