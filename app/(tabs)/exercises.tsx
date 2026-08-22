import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createExerciseService } from '../../src/modules/exercise';
import type { ExerciseMaster } from '../../src/modules/exercise';
import { Button, Card, Input } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

export default function ExercisesScreen() {
  const store = useStores(); const api = useMemo(() => createExerciseService(store), [store]);
  const [items, setItems] = useState<ExerciseMaster[]>([]); const [query, setQuery] = useState(''); const [name, setName] = useState(''); const [aliases, setAliases] = useState('');
  const load = useCallback(async () => setItems(await api.searchExercises(query)), [api, query]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const create = async () => { if (!name.trim()) return; await api.createExercise({ name, aliases: aliases.split(',').map(value => value.trim()).filter(Boolean), category: 'other', movementPattern: 'other', primaryMuscles: ['other'], secondaryMuscles: [] }); setName(''); setAliases(''); await load(); };
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}><Text style={typography.h1}>Exercises</Text><Input label="Search name or alias" value={query} onChangeText={setQuery} placeholder="bench / 卧推" /><Input label="New exercise" value={name} onChangeText={setName} placeholder="Exercise name" /><Input label="Aliases (comma separated)" value={aliases} onChangeText={setAliases} placeholder="Alias one, Alias two" /><Button title="Create Exercise" onPress={() => void create()} disabled={!name.trim()} />
    <View style={{ marginTop: spacing.xl }}>{items.map(item => <Card key={item.id} style={{ marginBottom: spacing.sm }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}><View style={{ flex: 1 }}><Text style={typography.body}>{item.name}</Text><Text style={typography.caption}>{item.category} · {item.movementPattern} · {item.primaryMuscles.join(', ')}</Text>{item.aliases.length > 0 && <Text style={typography.caption}>{item.aliases.join(', ')}</Text>}</View><TouchableOpacity onPress={() => void api.archiveExercise(item.id).then(load)}><Text style={{ color: colors.danger }}>Archive</Text></TouchableOpacity></View></Card>)}</View>
  </ScrollView>;
}
