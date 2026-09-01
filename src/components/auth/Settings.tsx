// ========================================
// GymFlow - Auth & Settings Component
// ========================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { colors, spacing, radius, typography, shadows } from '../../lib/theme';
import { Button, Card, Divider, Input } from '../ui';
import {
  isConfigured,
  configureSupabase,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getCurrentUser,
  processSyncQueue,
  syncTemplatesToCloud,
} from '../../lib/supabase';

type AuthMode = 'login' | 'signup' | 'config';

export function AuthSettings({ onClose, onIdentityChanged }: { onClose?: () => void; onIdentityChanged?: () => void }) {
  const [configured, setConfigured] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<AuthMode>('config');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    checkConfig();
  }, []);

  const checkConfig = async () => {
    const ok = await isConfigured();
    setConfigured(ok);
    if (ok) {
      const u = await getCurrentUser();
      setUser(u);
      if (u) setMode('login');
    }
  };

  const handleConfigure = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      Alert.alert('Error', 'Please enter both URL and Anon Key');
      return;
    }
    setLoading(true);
    await configureSupabase(supabaseUrl.trim(), supabaseAnonKey.trim());
    setConfigured(true);
    setMode('login');
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const { user: u, error } = await signInWithEmail(email, password);
    if (error) {
      Alert.alert('Login Failed', error);
    } else {
      setUser(u);
      onIdentityChanged?.();
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { user: u, error } = await signUpWithEmail(email, password);
    if (error) {
      Alert.alert('Sign Up Failed', error);
    } else {
      Alert.alert('Success', 'Check your email for confirmation link');
      setUser(u);
      onIdentityChanged?.();
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    const result = await processSyncQueue();
    const templates = await syncTemplatesToCloud();
    Alert.alert(
      'Sync Complete',
      `Sessions: ${result.synced} synced, ${result.failed} failed\nTemplates: ${templates} synced`
    );
    setSyncing(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    onIdentityChanged?.();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={typography.h2}>Settings</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sync Status */}
      <Card style={{ margin: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={typography.body}>Cloud Sync</Text>
            <Text style={[typography.caption, { marginTop: 2 }]}>
              {user ? `Signed in as ${user.email}` : configured ? 'Not signed in' : 'Not configured'}
            </Text>
          </View>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: user ? colors.primary : colors.textMuted }} />
        </View>
      </Card>

      {/* Supabase Config */}
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
        <Text style={[typography.label, { marginBottom: spacing.md }]}>Supabase Configuration</Text>
        <Input
          label="Supabase URL"
          value={supabaseUrl}
          onChangeText={setSupabaseUrl}
          placeholder="https://your-project.supabase.co"
        />
        <Input
          label="Anon Key"
          value={supabaseAnonKey}
          onChangeText={setSupabaseAnonKey}
          placeholder="your-anon-key"
        />
        <Button
          title="Save Configuration"
          onPress={handleConfigure}
          loading={loading}
          disabled={!supabaseUrl.trim() || !supabaseAnonKey.trim()}
        />
      </View>

      <Divider style={{ marginHorizontal: spacing.lg }} />

      {/* Auth */}
      {configured && !user && (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Text style={[typography.label, { marginBottom: spacing.md }]}>
            {mode === 'signup' ? 'Create Account' : 'Sign In'}
          </Text>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="password"
          />
          {mode === 'login' ? (
            <>
              <Button title="Sign In" onPress={handleLogin} loading={loading} />
              <TouchableOpacity
                onPress={() => setMode('signup')}
                style={{ alignItems: 'center', marginTop: spacing.md }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  Don't have an account? <Text style={{ color: colors.primary }}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Button title="Create Account" onPress={handleSignUp} loading={loading} />
              <TouchableOpacity
                onPress={() => setMode('login')}
                style={{ alignItems: 'center', marginTop: spacing.md }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                  Already have an account? <Text style={{ color: colors.primary }}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Sync Actions */}
      {configured && user && (
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
          <Text style={[typography.label, { marginBottom: spacing.md }]}>Sync</Text>
          <Button
            title="Sync Now"
            onPress={handleSync}
            loading={syncing}
            variant="secondary"
            style={{ marginBottom: spacing.md }}
          />
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="ghost"
          />
        </View>
      )}

      {/* App Info */}
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing['4xl'] }}>
        <Divider />
        <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
          <Text style={[typography.caption, { fontSize: 16, marginBottom: spacing.xs }]}>🏋️</Text>
          <Text style={typography.caption}>GymFlow v1.0.0</Text>
          <Text style={[typography.caption, { marginTop: 4 }]}>Offline-First Workout Tracker</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});
