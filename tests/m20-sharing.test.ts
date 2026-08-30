import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createProgramService } from '../src/modules/program';
import { createUserService } from '../src/modules/user';
import { createSocialService } from '../src/modules/social';
import { createSharingService } from '../src/modules/sharing';
import { createWorkoutService } from '../src/modules/workout';
import { createSocialProfileService } from '../src/modules/social-profile';

test('M20 copies a Program with a new owner, Program ID, and exercise entry IDs', async () => {
  const store = createWebStore();
  const users = createUserService(store);
  const owner = await users.getCurrentUser();
  const copier = await users.createUser({ displayName: 'Copier' });
  const programs = createProgramService(store) as any;
  const source = await programs.createProgram({ name: 'Source', description: 'Original', exercises: [{ id: 'entry-a', exerciseId: 'bench_press', order: 0, targetSets: [{ setIndex: 0, weight: 80, reps: 5, unit: 'kg' }] }] });
  const copy = await programs.copyProgram({ sourceProgramId: source.id, newOwnerUserId: copier.id });
  assert.notEqual(copy.id, source.id);
  assert.equal(copy.ownerUserId, copier.id);
  assert.equal(copy.name, 'Source — Copy');
  assert.notEqual(copy.exercises[0].id, source.exercises[0].id);
  assert.deepEqual(copy.exercises[0].targetSets, source.exercises[0].targetSets);
  assert.equal((await programs.getProgram(source.id))?.ownerUserId, owner.id);
});

test('M20 exposes a shared Workout only through a visible Post and never its raw notes', async () => {
  const store = createWebStore(); const users = createUserService(store); const a = await users.getCurrentUser(); const b = await users.createUser({ displayName: 'B' }); const workouts = createWorkoutService(store); const social = createSocialService(store); const sharing: any = createSharingService({ users, programs: createProgramService(store), workouts, social });
  const workout = await workouts.startQuickWorkout(); await social.createPost({ authorUserId: a.id, content: '', workoutSessionId: workout.id, visibility: 'public' });
  const view = await sharing.getSharedWorkoutView({ viewerUserId: b.id, sessionId: workout.id });
  assert.equal(view.workout.id, workout.id); assert.equal('notes' in view.workout, false);
});

test('M20 only permits shared Program viewing and copying through a visible Post', async () => {
  const store = createWebStore(); const users = createUserService(store); const a = await users.getCurrentUser(); const b = await users.createUser({ displayName: 'B' }); const c = await users.createUser({ displayName: 'C' });
  const programs = createProgramService(store); const social = createSocialService(store); const sharing = createSharingService({ users, programs, social });
  const source = await programs.createProgram({ name: 'Shared', description: '', exercises: [] });
  await social.createPost({ authorUserId: a.id, content: '', programId: source.id, visibility: 'followers' });
  await social.followUser({ followerUserId: b.id, followedUserId: a.id });
  assert.equal((await sharing.getSharedProgramView({ viewerUserId: b.id, programId: source.id })).program.id, source.id);
  await assert.rejects(() => sharing.getSharedProgramView({ viewerUserId: c.id, programId: source.id }), /SHARED_PROGRAM_NOT_AVAILABLE/);
  const copy = await sharing.copySharedProgram({ viewerUserId: b.id, sourceProgramId: source.id });
  assert.equal(copy.ownerUserId, b.id);
});

test('M20 shared Program copy remains usable when the public API method is destructured', async () => {
  const store = createWebStore();
  const users = createUserService(store);
  const owner = await users.getCurrentUser();
  const viewer = await users.createUser({ displayName: 'Destructured caller' });
  const programs = createProgramService(store);
  const social = createSocialService(store);
  const sharing = createSharingService({ users, programs, social });
  const source = await programs.createProgram({ name: 'Destructured', description: '', exercises: [] });
  await social.createPost({ authorUserId: owner.id, content: '', programId: source.id, visibility: 'public' });

  const { copySharedProgram } = sharing;
  const copy = await copySharedProgram({ viewerUserId: viewer.id, sourceProgramId: source.id });
  assert.equal(copy.ownerUserId, viewer.id);
});

test('M20 revokes a Program share after its final visible Post is deleted without affecting an existing copy', async () => {
  const store = createWebStore();
  const users = createUserService(store);
  const owner = await users.getCurrentUser();
  const viewer = await users.createUser({ displayName: 'Viewer' });
  const programs = createProgramService(store);
  const social = createSocialService(store);
  const sharing = createSharingService({ users, programs, social });
  const source = await programs.createProgram({ name: 'Revocable', description: '', exercises: [] });
  const post = await social.createPost({ authorUserId: owner.id, content: '', programId: source.id, visibility: 'public' });

  const copy = await sharing.copySharedProgram({ viewerUserId: viewer.id, sourceProgramId: source.id });
  await social.deletePost({ postId: post.id, authorUserId: owner.id });

  await assert.rejects(() => sharing.getSharedProgramView({ viewerUserId: viewer.id, programId: source.id }), /SHARED_PROGRAM_NOT_AVAILABLE/);
  assert.equal((await programs.getProgram(copy.id))?.ownerUserId, viewer.id);
});

test('M20 profile returns only viewer-visible posts and deduplicated shared references', async () => {
  const store = createWebStore();
  const users = createUserService(store);
  const author = await users.getCurrentUser();
  const follower = await users.createUser({ displayName: 'Follower' });
  const outsider = await users.createUser({ displayName: 'Outsider' });
  const social = createSocialService(store);
  const profiles = createSocialProfileService({ users, social });
  const program = await createProgramService(store).createProgram({ name: 'Profile Program', description: '', exercises: [] });
  await social.createPost({ authorUserId: author.id, content: 'Public', programId: program.id, visibility: 'public' });
  await social.createPost({ authorUserId: author.id, content: 'Private', programId: program.id, visibility: 'private' });
  await social.followUser({ followerUserId: follower.id, followedUserId: author.id });
  await social.createPost({ authorUserId: author.id, content: 'Followers', programId: program.id, visibility: 'followers' });

  const followerProfile = await profiles.getSocialProfile({ userId: author.id, viewerUserId: follower.id });
  const outsiderProfile = await profiles.getSocialProfile({ userId: author.id, viewerUserId: outsider.id });
  assert.equal(followerProfile.socialStats.postCount, 2);
  assert.deepEqual(followerProfile.sharedProgramIds, [program.id]);
  assert.equal(followerProfile.followerUsers[0]?.id, follower.id);
  assert.equal(outsiderProfile.socialStats.postCount, 1);
});
