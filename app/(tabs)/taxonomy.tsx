import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createMovementFamilyService, type MovementFamily } from '../../src/modules/movement-family';
import { createExerciseEquipmentService, type ExerciseExecutionProfile, type RequirementLevel } from '../../src/modules/exercise-equipment';
import { createExerciseSubstitutionService, type ExerciseSubstitution, type SubstitutionQuality } from '../../src/modules/exercise-substitution';
import { createCandidateResolutionService, type ExerciseCandidate } from '../../src/modules/candidate-resolution';
import { Button, Card, Input } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

const exerciseId = 'bench_press';

export default function TaxonomyScreen() {
  const store = useStores();
  const familiesApi = useMemo(() => createMovementFamilyService(store), [store]);
  const executionApi = useMemo(() => createExerciseEquipmentService(store), [store]);
  const substitutionApi = useMemo(() => createExerciseSubstitutionService(store), [store]); const candidateApi = useMemo(() => createCandidateResolutionService(store), [store]);
  const [items, setItems] = useState<MovementFamily[]>([]); const [profile, setProfile] = useState<ExerciseExecutionProfile | null>(null);
  const [query, setQuery] = useState(''); const [name, setName] = useState(''); const [selectedId, setSelectedId] = useState<string | null>(null);
  const [substitutions, setSubstitutions] = useState<ExerciseSubstitution[]>([]); const [candidates, setCandidates] = useState<ExerciseCandidate[]>([]); const [targetId, setTargetId] = useState('dumbbell_bench_press');
  const load = useCallback(async () => { setItems(await familiesApi.searchMovementFamilies(query)); setProfile(await executionApi.getExerciseExecutionProfile(exerciseId)); setSubstitutions(await substitutionApi.listSubstitutionsForSource(exerciseId)); setCandidates(await candidateApi.resolveExerciseCandidates({ exerciseId, limit: 8 })); }, [familiesApi, executionApi, substitutionApi, candidateApi, query]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const create = async () => { if (!name.trim()) return; const family = await familiesApi.createMovementFamily({ name, primaryMuscles: ['other'], secondaryMuscles: [] }); setName(''); setSelectedId(family.id); await load(); };
  const assign = async () => { if (!selectedId) return; await executionApi.assignExerciseToMovementFamily(exerciseId, selectedId, 'secondary'); await load(); };
  const addRequirement = async () => { const group = await executionApi.createRequirementGroup(exerciseId, { name: 'Development equipment option', priority: 99 }); await executionApi.addEquipmentRequirement(group.id, { equipmentId: 'web-equipment-2', level: 'preferred' }); await load(); };
  const updateRole = async (familyId: string, role: 'primary' | 'secondary') => { await executionApi.assignExerciseToMovementFamily(exerciseId, familyId, role); await load(); };
  const removeAssignment = async (familyId: string) => { await executionApi.removeExerciseFromMovementFamily(exerciseId, familyId); await load(); };
  const removeGroup = async (groupId: string) => { await executionApi.removeRequirementGroup(groupId); await load(); };
  const updateLevel = async (requirementId: string, level: RequirementLevel) => { await executionApi.updateEquipmentRequirement(requirementId, { level }); await load(); };
  const removeRequirement = async (requirementId: string) => { await executionApi.removeEquipmentRequirement(requirementId); await load(); };
  const addSubstitution = async () => { if (!targetId.trim()) return; await substitutionApi.createSubstitution({ sourceExerciseId: exerciseId, targetExerciseId: targetId.trim(), quality: 'good' }); await load(); };
  const updateQuality = async (id: string, quality: SubstitutionQuality) => { await substitutionApi.updateSubstitution(id, { quality }); await load(); };
  const archiveSubstitution = async (id: string) => { await substitutionApi.archiveSubstitution(id); await load(); };
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
    <Text style={typography.h1}>Exercise Taxonomy</Text>
    <Text style={typography.caption}>Development validation for movement families and equipment requirements.</Text>
    <Input label="Search movement family" value={query} onChangeText={setQuery} placeholder="press / 卧推类" />
    <Input label="New movement family" value={name} onChangeText={setName} placeholder="Family name" />
    <Button title="Create Family" onPress={() => void create()} disabled={!name.trim()} />
    <View style={{ marginTop: spacing.xl, gap: spacing.sm }}>{items.map(item => <Card key={item.id}><TouchableOpacity onPress={() => setSelectedId(item.id)}><Text style={[typography.body, { color: selectedId === item.id ? colors.primary : colors.text }]}>{item.name}</Text><Text style={typography.caption}>{item.primaryMuscles.join(', ')} · {item.aliases.join(', ') || 'no aliases'}</Text></TouchableOpacity><TouchableOpacity onPress={() => void familiesApi.archiveMovementFamily(item.id).then(load)}><Text style={{ color: colors.danger, marginTop: spacing.sm }}>Archive</Text></TouchableOpacity></Card>)}</View>
    <View style={{ marginTop: spacing.xl }}><Button title="Assign selected family to Bench Press" onPress={() => void assign()} disabled={!selectedId} /><Button title="Add preferred dumbbell option to Bench Press" onPress={() => void addRequirement()} /></View>
    {profile && <View style={{ marginTop: spacing.xl }}><Text style={typography.h2}>{profile.exercise.name} execution profile</Text>
      <Text style={[typography.body, { marginTop: spacing.md }]}>Movement Family assignments</Text>
      {profile.movementFamilyAssignments.map(assignment => <Card key={assignment.id} style={{ marginTop: spacing.sm }}><Text style={typography.body}>{assignment.movementFamily.name}</Text><Text style={typography.caption}>Current role: {assignment.role}</Text><View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}><TouchableOpacity onPress={() => void updateRole(assignment.movementFamilyId, 'primary')}><Text style={{ color: colors.primary }}>Primary</Text></TouchableOpacity><TouchableOpacity onPress={() => void updateRole(assignment.movementFamilyId, 'secondary')}><Text style={{ color: colors.primary }}>Secondary</Text></TouchableOpacity><TouchableOpacity onPress={() => void removeAssignment(assignment.movementFamilyId)}><Text style={{ color: colors.danger }}>Remove</Text></TouchableOpacity></View></Card>)}
      <Text style={[typography.body, { marginTop: spacing.xl }]}>Requirement groups (OR)</Text>
      {profile.requirementGroups.map(group => <Card key={group.id} style={{ marginTop: spacing.sm }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}><View><Text style={typography.body}>{group.name || 'Equipment option'}</Text><Text style={typography.caption}>Priority {group.priority}; requirements are AND</Text></View><TouchableOpacity onPress={() => void removeGroup(group.id)}><Text style={{ color: colors.danger }}>Delete group</Text></TouchableOpacity></View>{group.requirements.map(item => <View key={item.id} style={{ marginTop: spacing.sm }}><Text style={typography.caption}>{item.equipmentId} — {item.level}</Text><View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>{(['required', 'preferred', 'optional'] as RequirementLevel[]).map(level => <TouchableOpacity key={level} onPress={() => void updateLevel(item.id, level)}><Text style={{ color: item.level === level ? colors.primary : colors.text }}>{level}</Text></TouchableOpacity>)}<TouchableOpacity onPress={() => void removeRequirement(item.id)}><Text style={{ color: colors.danger }}>Remove</Text></TouchableOpacity></View></View>)}</Card>)}</View>}
    <View style={{ marginTop: spacing.xl }}><Text style={typography.h2}>Substitution candidates</Text>{candidates.map(item => <Text key={item.exerciseId} style={typography.caption}>{item.exerciseId}: {item.score.toFixed(2)} — {item.sources.join(', ')} — {item.reasons.join(', ')}</Text>)}<Input label="Curated target exercise ID" value={targetId} onChangeText={setTargetId} placeholder="dumbbell_bench_press" /><Button title="Create curated substitution" onPress={() => void addSubstitution()} disabled={!targetId.trim()} />{substitutions.map(item => <Card key={item.id} style={{ marginTop: spacing.sm }}><Text style={typography.body}>{item.targetExerciseId} — {item.quality}</Text><View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>{(['excellent', 'good', 'acceptable', 'last_resort'] as SubstitutionQuality[]).map(quality => <TouchableOpacity key={quality} onPress={() => void updateQuality(item.id, quality)}><Text style={{ color: item.quality === quality ? colors.primary : colors.text }}>{quality}</Text></TouchableOpacity>)}<TouchableOpacity onPress={() => void archiveSubstitution(item.id)}><Text style={{ color: colors.danger }}>Archive</Text></TouchableOpacity></View></Card>)}</View>
  </ScrollView>;
}
