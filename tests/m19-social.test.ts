import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebStore } from '../src/db/web-store';
import { createSocialService } from '../src/modules/social';
import { createUserService } from '../src/modules/user';
import { createProgramService } from '../src/modules/program';
import { createWorkoutService } from '../src/modules/workout';

async function fixture() {
  const store = createWebStore();
  const users = createUserService(store);
  const a = await users.getCurrentUser();
  const b = await users.createUser({ displayName: 'B' });
  const c = await users.createUser({ displayName: 'C' });
  return { store, users, a, b, c, social: createSocialService(store) };
}

test('M19 applies visibility for author, follower, and other viewers', async () => {
  const { social, a, b, c } = await fixture();
  await social.createPost({ id: 'private', authorUserId: a.id, content: 'private', visibility: 'private' });
  await social.createPost({ id: 'followers', authorUserId: a.id, content: 'followers', visibility: 'followers' });
  await social.createPost({ id: 'public', authorUserId: a.id, content: 'public', visibility: 'public' });
  await social.followUser({ followerUserId: b.id, followedUserId: a.id });
  assert.equal((await social.listPostsByUser({ userId: a.id, viewerUserId: a.id })).length, 3);
  assert.deepEqual((await social.listPostsByUser({ userId: a.id, viewerUserId: b.id })).map(post => post.visibility).sort(), ['followers', 'public']);
  assert.deepEqual((await social.listPostsByUser({ userId: a.id, viewerUserId: c.id })).map(post => post.visibility), ['public']);
});

test('M19 rejects empty and foreign references while allowing own Workout and Program summaries', async () => {
  const { social, a, b, store } = await fixture();
  await assert.rejects(() => social.createPost({ authorUserId: a.id, content: ' ', visibility: 'private' }), /POST_EMPTY/);
  const workout = await createWorkoutService(store).startQuickWorkout();
  const program = await createProgramService(store).createProgram({ name: 'Owned', description: '', exercises: [] });
  await assert.rejects(() => social.createPost({ authorUserId: b.id, content: '', workoutSessionId: workout.id, visibility: 'public' }), /WORKOUT_REFERENCE_NOT_ALLOWED/);
  await assert.rejects(() => social.createPost({ authorUserId: b.id, content: '', programId: program.id, visibility: 'public' }), /PROGRAM_REFERENCE_NOT_ALLOWED/);
  const post = await social.createPost({ authorUserId: a.id, content: '', workoutSessionId: workout.id, programId: program.id, visibility: 'public' });
  const view = await social.getPostView({ postId: post.id, viewerUserId: b.id });
  assert.equal(view.workout?.id, workout.id);
  assert.equal(view.program?.id, program.id);
});

test('M19 keeps likes, comments, saves, and deletion private and idempotent', async () => {
  const { social, a, b, c } = await fixture();
  const post = await social.createPost({ authorUserId: a.id, content: 'hello', visibility: 'public' });
  await social.likePost({ userId: b.id, postId: post.id });
  await social.likePost({ userId: b.id, postId: post.id });
  await social.savePost({ userId: b.id, postId: post.id });
  const comment = await social.createComment({ postId: post.id, authorUserId: b.id, content: 'nice' });
  await assert.rejects(() => social.deleteComment({ postId: post.id, commentId: comment.id, authorUserId: c.id }), /COMMENT_NOT_FOUND/);
  assert.equal((await social.getPostView({ postId: post.id, viewerUserId: b.id })).likeCount, 1);
  assert.equal((await social.listSavedPosts(b.id)).length, 1);
  await social.deleteComment({ postId: post.id, commentId: comment.id, authorUserId: b.id });
  assert.equal((await social.listComments({ postId: post.id, viewerUserId: b.id })).length, 0);
  await social.deletePost({ postId: post.id, authorUserId: a.id });
  await assert.rejects(() => social.getPost({ postId: post.id, viewerUserId: b.id }), /POST_NOT_FOUND/);
});

test('M19 returns chronological following feeds and excludes archived authors', async () => {
  const { social, users, a, b, c } = await fixture();
  await social.followUser({ followerUserId: b.id, followedUserId: a.id });
  await social.createPost({ id: 'a-1', authorUserId: a.id, content: 'one', visibility: 'followers' });
  await social.createPost({ id: 'a-2', authorUserId: a.id, content: 'two', visibility: 'public' });
  await social.createPost({ id: 'c-1', authorUserId: c.id, content: 'outside', visibility: 'public' });
  const first = await social.listFollowingFeed({ viewerUserId: b.id, limit: 1 });
  const second = await social.listFollowingFeed({ viewerUserId: b.id, limit: 1, cursor: first.nextCursor });
  assert.equal(first.posts.length, 1); assert.equal(second.posts.length, 1); assert.notEqual(first.posts[0].id, second.posts[0].id);
  assert.equal((await social.listPublicFeed({ viewerUserId: b.id, limit: 10 })).posts.some(post => post.id === 'c-1'), true);
  await users.archiveUser(c.id);
  assert.equal((await social.listPublicFeed({ viewerUserId: b.id, limit: 10 })).posts.some(post => post.id === 'c-1'), false);
  await assert.rejects(() => social.followUser({ followerUserId: b.id, followedUserId: c.id }), /USER_NOT_AVAILABLE/);
});
