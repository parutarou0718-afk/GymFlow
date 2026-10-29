import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getAuthClient, allowsDevelopmentTestAccounts } from '../../modules/auth-client';
import { colors, spacing, typography } from '../../lib/theme';
import { Button, Card, Input } from '../ui';

export function AuthSettings({ onIdentityChanged }: { onIdentityChanged?: () => void }) {
  const [displayName, setDisplayName] = useState('GymFlow Test User');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const developmentAccountsAllowed = allowsDevelopmentTestAccounts();

  const submit = async (mode: 'sign-in' | 'sign-up') => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Account details required', 'Enter an email and password.');
      return;
    }
    try {
      setLoading(true);
      const auth = getAuthClient();
      if (mode === 'sign-up') await auth.signUp({ displayName: displayName.trim() || 'GymFlow Test User', email: email.trim(), password });
      else await auth.signIn({ email: email.trim(), password });
      onIdentityChanged?.();
    } catch (error) {
      Alert.alert('Authentication failed', error instanceof Error ? error.message : 'Unable to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await getAuthClient().signOut();
      onIdentityChanged?.();
    } catch (error) {
      Alert.alert('Sign out failed', error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={typography.h1}>GymFlow</Text>
    {developmentAccountsAllowed ? <>
      <Text style={[typography.body, styles.intro]}>Development Test Account</Text>
      <Card>
        <Text style={typography.caption}>Only development and test builds can create these accounts. They are not available in preview or production.</Text>
        <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="GymFlow Test User" />
        <Input label="Test email" value={email} onChangeText={setEmail} placeholder="test-a@gymflow.local" keyboardType="email-address" />
        <Input label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" />
        <View style={styles.actions}>
          <Button title="Sign In Test Account" onPress={() => void submit('sign-in')} loading={loading} />
          <Button title="Create Test Account" onPress={() => void submit('sign-up')} loading={loading} variant="secondary" />
          <Button title="Sign Out" onPress={() => void signOut()} loading={loading} variant="ghost" />
        </View>
      </Card>
    </> : <Card>
      <Text style={typography.h2}>Sign in is not available</Text>
      <Text style={[typography.body, styles.intro]}>This build requires verified phone authentication, which has not been enabled yet.</Text>
    </Card>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing['4xl'], gap: spacing.lg },
  intro: { color: colors.textSecondary, marginTop: spacing.sm },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
