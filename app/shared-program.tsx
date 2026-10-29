import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useStores } from '../src/db/stores';
import { createProgramService } from '../src/modules/program';
import { createSharingService } from '../src/modules/sharing';
import { createSocialService } from '../src/modules/social';
import { createUserService } from '../src/modules/user';
import { Button, Card, SectionHeader } from '../src/components/ui';
import { colors, spacing, typography } from '../src/lib/theme';
import { useCurrentUser } from '../src/modules/current-user';

export default function SharedProgramScreen() {
  const identity = useCurrentUser();
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const store = useStores();
  const users = useMemo(() => createUserService(store), [store]);
  const programs = useMemo(() => createProgramService(store), [store]);
  const social = useMemo(() => createSocialService(store), [store]);
  const sharing = useMemo(() => createSharingService({ users, programs, social }), [programs, social, users]);
  const [view, setView] = useState<Awaited<ReturnType<typeof sharing.getSharedProgramView>> | null>(null);
  const [viewerId, setViewerId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!programId) return;
    try {
      const viewer = identity.user;
      if (!viewer) return;
      setViewerId(viewer.id);
      setView(await sharing.getSharedProgramView({ viewerUserId: viewer.id, programId }));
      setMessage('');
    } catch {
      setView(null);
      setMessage('This shared Program is no longer available.');
    }
  }, [identity.user, programId, sharing]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const copy = async () => {
    if (!programId || busy) return;
    try {
      setBusy(true);
      const program = await sharing.copySharedProgram({ viewerUserId: viewerId, sourceProgramId: programId });
      router.replace({ pathname: '/program-detail' as any, params: { programId: program.id } });
    } catch {
      setMessage('Unable to copy this Program. It may no longer be shared.');
    } finally {
      setBusy(false);
    }
  };

  if (!view) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={typography.body}>{message || 'Loading shared Program...'}</Text></View>;
  const isOwner = view.owner.id === viewerId;
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
    <Text style={typography.h1}>{view.program.name}</Text>
    <Text style={typography.caption}>Shared by {view.owner.displayName}</Text>
    {view.program.description ? <Text style={[typography.body, { marginTop: spacing.md }]}>{view.program.description}</Text> : null}
    {!isOwner ? <Button title="Copy Program" onPress={() => void copy()} loading={busy} disabled={busy} style={{ marginTop: spacing.md }} /> : null}
    <SectionHeader title="Exercises" />
    {view.program.exercises.map(exercise => <Card key={exercise.id}><Text style={typography.body}>{exercise.exerciseId}</Text><Text style={typography.caption}>{exercise.targetSets.length} target sets</Text></Card>)}
  </ScrollView>;
}
