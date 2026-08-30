import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { createWebStore } from '../src/db/web-store';
import { createProgramInputFromCompletedWorkout, createProgramService } from '../src/modules/program';
import { createWorkoutService } from '../src/modules/workout';
import { DEFAULT_LOCAL_USER_ID } from '../src/modules/user';

test('ProgramService preserves existing IDs while delegating CRUD to template persistence', async () => {
  const service = createProgramService(createWebStore());
  const program = {
    name: 'Push',
    exercises: [],
  };

  const created = await service.createProgram(program);
  assert.ok(created.id);
  assert.equal((await service.getProgram(created.id))?.name, 'Push');
  assert.equal((await service.listPrograms()).some(item => item.id === created.id), true);
});

test('M19 assigns the current user as owner for newly created Programs and Workouts', async () => {
  const store = createWebStore();
  const programs = createProgramService(store);
  const workouts = createWorkoutService(store);
  const program = await programs.createProgram({ name: 'Owned', description: '', exercises: [] });
  const workout = await workouts.startQuickWorkout();

  assert.equal(program.ownerUserId, DEFAULT_LOCAL_USER_ID);
  assert.equal(workout.ownerUserId, DEFAULT_LOCAL_USER_ID);
  assert.equal((await programs.listPrograms()).every(item => item.ownerUserId === DEFAULT_LOCAL_USER_ID), true);
  assert.equal((await store.sessions.getAll()).every(item => item.ownerUserId === DEFAULT_LOCAL_USER_ID), true);
});

test('Plans and template form use the Program public API instead of store.templates', async () => {
  const [plans, form] = await Promise.all([
    readFile(resolve(process.cwd(), 'app/(tabs)/plans.tsx'), 'utf8'),
    readFile(resolve(process.cwd(), 'app/template-form.tsx'), 'utf8'),
  ]);

  assert.match(plans, /createProgramService/);
  assert.doesNotMatch(plans, /store\.templates|\{ templates \} = useStores/);
  assert.match(form, /createProgramService/);
  assert.doesNotMatch(form, /store\.templates|\{ templates \} = useStores/);
});

test('ProgramService reads seeded IDs and keeps update and delete compatible with existing storage', async () => {
  const service = createProgramService(createWebStore());
  const existing = (await service.listPrograms())[0];
  assert.ok(existing);

  await service.updateProgram({ ...existing, name: 'Updated seeded program' });
  assert.equal((await service.getProgram(existing.id))?.name, 'Updated seeded program');

  const temporary = {
    name: 'Temporary',
    exercises: [],
  };
  const created = await service.createProgram(temporary);
  await service.deleteProgram(created.id);
  assert.equal(await service.getProgram(created.id), null);
});

test('ProgramService copies a completed workout into an independently mutable Program', async () => {
  const store = createWebStore();
  const service = createProgramService(store);
  const session = (await store.sessions.getAll())[0];
  assert.ok(session);

  const input = createProgramInputFromCompletedWorkout(session, 'Copied workout');
  assert.equal(input.name, 'Copied workout');
  assert.deepEqual(input.exercises.map(item => item.exerciseId), session.exercises.map(item => item.exerciseId));
  assert.deepEqual(
    input.exercises.map(item => item.targetSets.map(set => ({ setIndex: set.setIndex, weight: set.weight, reps: set.reps }))),
    session.exercises.map(item => item.sets.map(set => ({ setIndex: set.setIndex, weight: set.weight, reps: set.reps }))),
  );

  const saved = await service.createProgram(input);
  assert.notEqual(saved.id, session.id);
  assert.notEqual(saved.exercises[0]?.id, session.exercises[0]?.id);

  const changedProgram = {
    ...saved,
    exercises: saved.exercises.map((exercise, index) => index === 0
      ? { ...exercise, targetSets: exercise.targetSets.map((set, setIndex) => setIndex === 0 ? { ...set, weight: 999 } : set) }
      : exercise),
  };
  await service.updateProgram(changedProgram);
  assert.notEqual((await store.sessions.get(session.id))?.exercises[0]?.sets[0]?.weight, 999);
});

test('History detail saves via the Program public API without direct template storage access', async () => {
  const history = await readFile(resolve(process.cwd(), 'src/components/history/index.tsx'), 'utf8');

  assert.match(history, /createProgramInputFromCompletedWorkout/);
  assert.match(history, /createProgramService/);
  assert.doesNotMatch(history, /store\.templates/);
});
