import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createGymService } from '../../src/modules/gym';
import type { Gym } from '../../src/modules/gym';
import { createEquipmentService } from '../../src/modules/equipment';
import type { Equipment } from '../../src/modules/equipment';
import { createInventoryService } from '../../src/modules/gym-inventory';
import type { GymEquipmentInventoryItem } from '../../src/modules/gym-inventory';
import { Button, Card, Input, SectionHeader } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

export default function GymsScreen() {
  const store = useStores();
  const gymsApi = useMemo(() => createGymService(store), [store]);
  const equipmentApi = useMemo(() => createEquipmentService(store), [store]);
  const inventoryApi = useMemo(() => createInventoryService(store), [store]);
  const [gyms, setGyms] = useState<Gym[]>([]); const [selected, setSelected] = useState<Gym | null>(null); const [items, setItems] = useState<GymEquipmentInventoryItem[]>([]); const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [gymName, setGymName] = useState(''); const [equipmentName, setEquipmentName] = useState(''); const [query, setQuery] = useState('');
  const refresh = useCallback(async () => { const [nextGyms, nextEquipment] = await Promise.all([gymsApi.listGyms(), equipmentApi.searchEquipment(query)]); setGyms(nextGyms); setEquipment(nextEquipment); if (selected) setItems(await inventoryApi.getGymEquipment(selected.id)); }, [gymsApi, equipmentApi, inventoryApi, query, selected]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const createGym = async () => { if (!gymName.trim()) return; const gym = await gymsApi.createGym({ name: gymName }); setGymName(''); setSelected(gym); setItems([]); await refresh(); };
  const createEquipment = async () => { if (!equipmentName.trim()) return; await equipmentApi.createEquipment({ name: equipmentName, category: 'machine' }); setEquipmentName(''); await refresh(); };
  const selectGym = async (gym: Gym) => { setSelected(gym); setItems(await inventoryApi.getGymEquipment(gym.id)); };
  const add = async (item: Equipment) => { if (!selected) return; try { await inventoryApi.addEquipmentToGym(selected.id, item.id, { quantity: 1 }); setItems(await inventoryApi.getGymEquipment(selected.id)); } catch (error) { Alert.alert('Unable to add', error instanceof Error ? error.message : 'Unknown error'); } };
  const changeQuantity = async (item: GymEquipmentInventoryItem, delta: number) => { if (item.quantity + delta < 1) return; await inventoryApi.updateGymEquipment(item.id, { quantity: item.quantity + delta }); if (selected) setItems(await inventoryApi.getGymEquipment(selected.id)); };
  const remove = async (item: GymEquipmentInventoryItem) => { if (!selected) return; await inventoryApi.removeEquipmentFromGym(selected.id, item.equipmentId); setItems(await inventoryApi.getGymEquipment(selected.id)); };
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
    <View style={{ padding: spacing.lg, paddingTop: spacing['4xl'] }}><Text style={typography.h1}>Gyms</Text></View><View style={{ paddingHorizontal: spacing.lg }}><Input label="New gym" value={gymName} onChangeText={setGymName} placeholder="XX Fitness" /><Button title="Create Gym" onPress={() => void createGym()} disabled={!gymName.trim()} /></View><SectionHeader title="Gyms" />
    {gyms.map(gym => <Card key={gym.id} onPress={() => void selectGym(gym)} style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderColor: selected?.id === gym.id ? colors.primary : colors.border }}><Text style={typography.body}>{gym.name}{gym.branchName ? ` · ${gym.branchName}` : ''}</Text><Text style={typography.caption}>{gym.status}</Text></Card>)}
    {selected && <><SectionHeader title={`${selected.name} inventory`} />{items.map(item => <Card key={item.id} style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={typography.body}>{equipment.find(value => value.id === item.equipmentId)?.name ?? item.equipmentId}</Text><View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}><TouchableOpacity onPress={() => void changeQuantity(item, -1)}><Text style={{ color: colors.primary }}>−</Text></TouchableOpacity><Text style={typography.body}>×{item.quantity}</Text><TouchableOpacity onPress={() => void changeQuantity(item, 1)}><Text style={{ color: colors.primary }}>+</Text></TouchableOpacity><TouchableOpacity onPress={() => void remove(item)}><Text style={{ color: colors.danger }}>Remove</Text></TouchableOpacity></View></View></Card>)}
      <View style={{ paddingHorizontal: spacing.lg }}><Input label="Search equipment" value={query} onChangeText={setQuery} placeholder="Hack Squat / 哈克" /><Input label="New equipment" value={equipmentName} onChangeText={setEquipmentName} placeholder="Equipment name" /><Button title="Create Equipment" onPress={() => void createEquipment()} variant="secondary" disabled={!equipmentName.trim()} /></View><SectionHeader title="Equipment library" />
      {equipment.map(item => <Card key={item.id} style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><Text style={typography.body}>{item.name}</Text><Text style={typography.caption}>{item.category}</Text></View><Button title="Add" size="sm" onPress={() => void add(item)} /></View></Card>)}</>}
  </ScrollView>;
}
