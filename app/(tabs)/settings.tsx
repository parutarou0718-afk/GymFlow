// ========================================
// GymFlow - Settings Tab
// ========================================

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radius, typography, shadows } from '../../src/lib/theme';
import { Card, Divider } from '../../src/components/ui';
import { AuthSettings } from '../../src/components/auth/Settings';
import { useCurrentUser } from '../../src/modules/current-user';

export default function SettingsTab() {
  const identity = useCurrentUser();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <AuthSettings onIdentityChanged={() => void identity.refresh()} />
    </ScrollView>
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
