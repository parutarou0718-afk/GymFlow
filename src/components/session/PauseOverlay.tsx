// ========================================
// GymFlow - Pause Overlay Component
// ========================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../lib/theme';
import { Button } from '../ui';

interface PauseOverlayProps {
  elapsed: number;
  saving: boolean;
  onResume: () => void;
  onFinish: () => void;
  formatTime: (seconds: number) => string;
}

export function PauseOverlay({ elapsed, saving, onResume, onFinish, formatTime }: PauseOverlayProps) {
  return (
    <View style={styles.overlay}>
      <Text style={styles.icon}>⏸</Text>
      <Text style={[typography.h1, { marginTop: spacing.lg }]}>Workout Paused</Text>
      <Text style={[typography.bodySmall, { marginTop: spacing.sm }]}>
        Time: {formatTime(elapsed)}
      </Text>
      <Button
        title="Resume Workout"
        onPress={onResume}
        variant="primary"
        size="lg"
        style={{ marginTop: spacing['2xl'], minWidth: 200 }}
      />
      <Button
        title="Finish Workout"
        onPress={onFinish}
        variant="danger"
        size="sm"
        style={{ marginTop: spacing.md, minWidth: 200 }}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  icon: {
    fontSize: 64,
  },
});
