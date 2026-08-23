import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import { createWebStore } from '../src/db/web-store';
import { createProgramService } from '../src/modules/program';

test('ProgramService preserves existing IDs while delegating CRUD to template persistence', async () => {
  const service = createProgramService(createWebStore());
  const program = {
    id: 'program-id',
    name: 'Push',
    exercises: [],
    createdAt: 1,
    updatedAt: 1,
  };

  const created = await service.createProgram(program);
  assert.equal(created.id, 'program-id');
  assert.equal((await service.getProgram('program-id'))?.name, 'Push');
  assert.equal((await service.listPrograms()).some(item => item.id === 'program-id'), true);
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
    id: 'temporary-program-id',
    name: 'Temporary',
    exercises: [],
    createdAt: 2,
    updatedAt: 2,
  };
  await service.createProgram(temporary);
  await service.deleteProgram(temporary.id);
  assert.equal(await service.getProgram(temporary.id), null);
});
