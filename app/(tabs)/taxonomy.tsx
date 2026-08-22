import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createMovementFamilyService, type MovementFamily } from '../../src/modules/movement-family';
import { createExerciseEquipmentService, type ExerciseExecutionProfile } from '../../src/modules/exercise-equipment';
import { Button, Card, Input } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

const exerciseId = 'bench_press';

export default function TaxonomyScreen() {
  const store = useStores();
  const familiesApi = useMemo(() => createMovementFamilyService(store), [store]);
  const executionApi = useMemo(() => createExerciseEquipmentService(store), [store]);
  const [items, setItems] = useState<MovementFamily[]>([]); const [profile, setProfile] = useState<ExerciseExecutionProfile | null>(null);
  const [query, setQuery] = useState(''); const [name, setName] = useState(''); const [selectedId, setSelectedId] = useState<string | null>(null);
  const load = useCallback(async () => { setItems(await familiesApi.searchMovementFamilies(query)); setProfile(await executionApi.getExerciseExecutionProfile(exerciseId)); }, [familiesApi, executionApi, query]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const create = async () => { if (!name.trim()) return; const family = await familiesApi.createMovementFamily({ name, primaryMuscles: ['other'], secondaryMuscles: [] }); setName(''); setSelectedId(family.id); await load(); };
  const assign = async () => { if (!selectedId) return; await executionApi.assignExerciseToMovementFamily(exerciseId, selectedId, 'secondary'); await load(); };
  const addRequirement = async () => { const group = await executionApi.createRequirementGroup(exerciseId, { name: 'Development equipment option', priority: 99 }); await executionApi.addEquipmentRequirement(group.id, { equipmentId: 'web-equipment-2', level: 'preferred' }); await load(); };
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
    <Text style={typography.h1}>Exercise Taxonomy</Text>
    <Text style={typography.caption}>Development validation for movement families and equipment requirements.</Text>
    <Input label="Search movement family" value={query} onChangeText={setQuery} placeholder="press / 卧推类" />
    <Input label="New movement family" value={name} onChangeText={setName} placeholder="Family name" />
    <Button title="Create Family" onPress={() => void create()} disabled={!name.trim()} />
    <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>{items.map(item => <Card key={item.id}><TouchableOpacity onPress={() => setSelectedId(item.id)}><Text style={[typography.body, { color: selectedId === item.id ? colors.primary : colors.text }]}>{item.name}</Text><Text style={typography.caption}>{item.primaryMuscles.join(', ')} · {item.aliases.join(', ') || 'no aliases'}</Text></TouchableOpacity><TouchableOpacity onPress={() => void familiesApi.archiveMovementFamily(item.id).then(load)}><Text style={{ color: colors.danger, marginTop: spacing.sm }}>Archive</Text></TouchableOpacity></Card>)}</View>
    <View style={{ marginTop: spacing.xl }}><Button title="Assign selected family to Bench Press" onPress={() => void assign()} disabled={!selectedId} /><Button title="Add preferred dumbbell option to Bench Press" onPress={() => void addRequirement()} /></View>
    {profile && <View style={{ marginTop: spacing.xl }}><Text style={typography.h2}>{profile.exercise.name} execution profile</Text><Text style={typography.caption}>Families: {profile.movementFamilies.map(item => item.name).join(', ') || 'none'}</Text>{profile.requirementGroups.map(group => <Card key={group.id} style={{ marginTop: spacing.sm }}><Text style={typography.body}>{group.name || 'Equipment option'} (OR)</Text><Text style={typography.caption}>{group.requirements.map(item => `${item.equipmentId}: ${item.level}`).join(' + ') || 'No equipment requirements'}</Text></Card>)}</View>}
  </ScrollView>;
}
