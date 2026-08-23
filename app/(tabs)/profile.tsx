import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createUserService } from '../../src/modules/user';
import type { ExperienceLevel, TrainingGoal, UserPrivacySettings, UserProfile, UserTrainingPreferences, UserVisibility } from '../../src/modules/user';
import { Button, Card, Input, SectionHeader } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

const experienceLevels: ExperienceLevel[] = ['unknown', 'beginner', 'intermediate', 'advanced'];
const goals: TrainingGoal[] = ['strength', 'hypertrophy', 'general_fitness', 'conditioning', 'mobility'];
const intents: NonNullable<UserTrainingPreferences['preferredTrainingIntent']>[] = ['unknown', 'strength', 'hypertrophy', 'general_fitness', 'conditioning', 'rehab'];
const visibilities: UserVisibility[] = ['private', 'followers', 'public'];

function nextValue<T>(values: readonly T[], current: T): T {
  return values[(values.indexOf(current) + 1) % values.length] ?? values[0]!;
}

export default function ProfileScreen() {
  const store = useStores();
  const api = useMemo(() => createUserService(store), [store]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('unknown');
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([]);
  const [preferences, setPreferences] = useState<UserTrainingPreferences>({ preferredUnits: 'metric', preferredTrainingIntent: 'unknown', defaultRestSeconds: null, preferMachines: null, preferFreeWeights: null });
  const [privacy, setPrivacy] = useState<UserPrivacySettings>({ profileVisibility: 'private', workoutVisibilityDefault: 'private', programVisibilityDefault: 'private' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const current = await api.getCurrentUser();
    setProfile(current);
    setDisplayName(current.displayName);
    setExperienceLevel(current.experienceLevel);
    setTrainingGoals(current.trainingGoals);
    setPreferences(current.preferences);
    setPrivacy(current.privacy);
    setMessage('Reloaded saved profile');
  }, [api]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggleGoal = (goal: TrainingGoal) => {
    setTrainingGoals(current => current.includes(goal) ? current.filter(item => item !== goal) : [...current, goal]);
  };

  const save = async () => {
    if (!profile || saving) return;
    try {
      setSaving(true);
      setMessage('');
      const saved = await api.updateUser(profile.id, { displayName, experienceLevel, trainingGoals, preferences, privacy });
      setProfile(saved);
      await load();
      setMessage('Saved and reloaded');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
    <View style={{ padding: spacing.lg, paddingTop: spacing['4xl'] }}>
      <Text style={typography.h1}>Profile</Text>
      <Text style={typography.caption}>Development validation only. This does not configure login or Social features.</Text>
    </View>
    <Card style={{ marginHorizontal: spacing.lg }}>
      <Text style={typography.label}>Current User ID</Text>
      <Text style={[typography.body, { marginTop: spacing.xs }]}>{profile?.id ?? 'Loading…'}</Text>
    </Card>
    <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.xl }}>
      <Input label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="GymFlow User" />
      <Text style={[typography.label, { marginBottom: spacing.sm }]}>Experience level</Text>
      <Button title={experienceLevel} onPress={() => setExperienceLevel(value => nextValue(experienceLevels, value))} variant="secondary" />
    </View>
    <SectionHeader title="Training goals" subtitle="Tap to select multiple goals" />
    <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {goals.map(goal => <TouchableOpacity key={goal} onPress={() => toggleGoal(goal)} style={{ borderWidth: 1, borderColor: trainingGoals.includes(goal) ? colors.primary : colors.border, backgroundColor: trainingGoals.includes(goal) ? colors.primaryBg : colors.bgCard, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}><Text style={{ color: trainingGoals.includes(goal) ? colors.primary : colors.text }}>{goal}</Text></TouchableOpacity>)}
    </View>
    <SectionHeader title="Preferences" />
    <View style={{ paddingHorizontal: spacing.lg }}>
      <Text style={[typography.label, { marginBottom: spacing.sm }]}>Preferred units</Text>
      <Button title={preferences.preferredUnits} onPress={() => setPreferences(value => ({ ...value, preferredUnits: value.preferredUnits === 'metric' ? 'imperial' : 'metric' }))} variant="secondary" />
      <Text style={[typography.label, { marginTop: spacing.lg, marginBottom: spacing.sm }]}>Preferred training intent</Text>
      <Button title={preferences.preferredTrainingIntent ?? 'unknown'} onPress={() => setPreferences(value => ({ ...value, preferredTrainingIntent: nextValue(intents, value.preferredTrainingIntent ?? 'unknown') }))} variant="secondary" />
      <Input label="Default rest seconds" value={preferences.defaultRestSeconds == null ? '' : String(preferences.defaultRestSeconds)} onChangeText={value => setPreferences(current => ({ ...current, defaultRestSeconds: value.trim() ? Number(value) : null }))} placeholder="Optional" keyboardType="numeric" style={{ marginTop: spacing.lg }} />
    </View>
    <SectionHeader title="Privacy defaults" />
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
      {([
        ['Profile visibility', 'profileVisibility'],
        ['Workout visibility', 'workoutVisibilityDefault'],
        ['Program visibility', 'programVisibilityDefault'],
      ] as const).map(([label, key]) => <View key={key}><Text style={[typography.label, { marginBottom: spacing.sm }]}>{label}</Text><Button title={privacy[key]} onPress={() => setPrivacy(value => ({ ...value, [key]: nextValue(visibilities, value[key]) }))} variant="secondary" /></View>)}
      <Button title="Save Profile" onPress={() => void save()} loading={saving} disabled={!profile || !displayName.trim()} style={{ marginTop: spacing.lg }} />
      <Button title="Reload" onPress={() => void load()} variant="ghost" disabled={saving} />
      {message ? <Text style={{ color: message.startsWith('Unable') || message.includes('required') ? colors.danger : colors.textSecondary, textAlign: 'center' }}>{message}</Text> : null}
    </View>
  </ScrollView>;
}
