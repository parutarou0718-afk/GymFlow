import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createGymService } from '../../src/modules/gym';
import { createMatchingService } from '../../src/modules/matching';
import { createProgramService } from '../../src/modules/program';
import { createProgramMatchingService, type ProgramGymMatchResult } from '../../src/modules/program-matching';
import { Button, Card, Input } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

export default function ProgramMatchingScreen() {
  const store = useStores();
  const programApi = useMemo(() => createProgramService(store), [store]);
  const gymApi = useMemo(() => createGymService(store), [store]);
  const api = useMemo(() => createProgramMatchingService({ programs: programApi, matching: createMatchingService(store) }), [programApi, store]);
  const [programId, setProgramId] = useState(''); const [gymId, setGymId] = useState(''); const [result, setResult] = useState<ProgramGymMatchResult | null>(null); const [error, setError] = useState('');
  const load = useCallback(async () => { const [programs, gyms] = await Promise.all([programApi.listPrograms(), gymApi.listGyms()]); if (!programId && programs[0]) setProgramId(programs[0].id); if (!gymId && gyms[0]) setGymId(gyms[0].id); }, [gymApi, gymId, programApi, programId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const match = async () => { try { setError(''); setResult(await api.matchProgramToGym({ programId, gymId })); } catch (reason) { setResult(null); setError(reason instanceof Error ? reason.message : 'Program matching failed'); } };
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}><Text style={typography.h1}>Program Matching</Text><Text style={typography.caption}>Development validation only. This page never changes a Program or Workout.</Text><Input label="Program ID" value={programId} onChangeText={setProgramId} placeholder="Program ID" /><Input label="Gym ID" value={gymId} onChangeText={setGymId} placeholder="Gym ID" /><Button title="Match Program" onPress={() => void match()} disabled={!programId || !gymId} />{error ? <Text style={{ color: colors.danger, marginTop: spacing.md }}>{error}</Text> : null}{result ? <View style={{ marginTop: spacing.xl }}><Card><Text style={typography.h2}>{result.status}</Text><Text style={typography.caption}>Total {result.summary.totalExercises} · executable {result.summary.executable} · warning {result.summary.executableWithWarning} · replaceable {result.summary.replaceable} · unresolved {result.summary.unresolved}</Text></Card>{result.exercises.map(item => <Card key={item.originalProgramExercise.id} style={{ marginTop: spacing.sm }}><Text style={typography.body}>{item.order + 1}. {item.originalProgramExercise.exercise?.name || item.exerciseId}</Text><Text style={typography.caption}>{item.match.status}</Text>{item.match.issues.map((issue, index) => <Text key={`${issue.code}-${index}`} style={typography.caption}>{issue.code}{issue.equipmentId ? ` · ${issue.equipmentId}` : ''}</Text>)}{item.recommendedAlternativeExerciseId ? <Text style={typography.caption}>Suggested: {item.recommendedAlternativeExerciseId}</Text> : null}</Card>)}</View> : null}</ScrollView>;
}
