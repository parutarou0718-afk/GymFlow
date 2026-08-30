import { generateId } from '../../lib/utils';
import type { GymFlowStore } from '../../db/types';
import { createGymService } from '../gym';
import { createProgramService } from '../program';
import { createUserService } from '../user';
import { createWorkoutService } from '../workout';
import type { CreateSocialPostInput, FeedCursor, FeedPage, ProfileSocialStats, SocialComment, SocialFollow, SocialPost, SocialPostView, SocialVisibility } from './types';

const visibilityValues: readonly SocialVisibility[] = ['private', 'followers', 'public'];
const compareNewest = (left: SocialPost, right: SocialPost) => right.createdAt - left.createdAt || right.id.localeCompare(left.id);

function assertPageLimit(limit: number | undefined): number {
  if (limit == null) return 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('INVALID_FEED_LIMIT');
  return limit;
}

function isAfterCursor(post: SocialPost, cursor: FeedCursor | null | undefined): boolean {
  return !cursor || post.createdAt < cursor.createdAt || (post.createdAt === cursor.createdAt && post.id.localeCompare(cursor.postId) < 0);
}

export function createSocialService(store: GymFlowStore) {
  const users = createUserService(store);
  const workouts = createWorkoutService(store);
  const programs = createProgramService(store);
  const gyms = createGymService(store);
  const requireActiveUser = async (userId: string) => {
    const user = await users.getUser(userId);
    if (!user || user.status !== 'active') throw new Error('USER_NOT_AVAILABLE');
    return user;
  };
  const validateReferences = async (input: CreateSocialPostInput) => {
    await requireActiveUser(input.authorUserId);
    if (input.workoutSessionId) {
      const workout = await workouts.getWorkout(input.workoutSessionId);
      if (!workout || workout.ownerUserId !== input.authorUserId) throw new Error('WORKOUT_REFERENCE_NOT_ALLOWED');
    }
    if (input.programId) {
      const program = await programs.getProgram(input.programId);
      if (!program || program.ownerUserId !== input.authorUserId) throw new Error('PROGRAM_REFERENCE_NOT_ALLOWED');
    }
    if (input.gymId) {
      const gym = await gyms.getGym(input.gymId);
      if (!gym || gym.status !== 'active') throw new Error('GYM_REFERENCE_NOT_ALLOWED');
    }
  };
  const isFollowing = async (followerUserId: string, followedUserId: string) =>
    (await store.social.listFollows()).some(item => item.followerUserId === followerUserId && item.followedUserId === followedUserId);

  const canRead = async (post: SocialPost, viewerUserId: string): Promise<boolean> =>
    post.status === 'active'
      && Boolean(await users.getPublicUserSummary(post.authorUserId))
      && (post.authorUserId === viewerUserId || post.visibility === 'public' || (post.visibility === 'followers' && await isFollowing(viewerUserId, post.authorUserId)));

  const requireReadable = async (postId: string, viewerUserId: string): Promise<SocialPost> => {
    const post = await store.social.getPost(postId);
    if (!post || !await canRead(post, viewerUserId)) throw new Error('POST_NOT_FOUND');
    return post;
  };

  const page = async (posts: SocialPost[], input: { cursor?: FeedCursor | null; limit?: number }): Promise<FeedPage> => {
    const limit = assertPageLimit(input.limit);
    const ordered = posts.filter(post => isAfterCursor(post, input.cursor)).sort(compareNewest);
    const result = ordered.slice(0, limit);
    const last = result.at(-1);
    return { posts: result, nextCursor: result.length === limit && last ? { createdAt: last.createdAt, postId: last.id } : null };
  };

  return {
    async createPost(input: CreateSocialPostInput): Promise<SocialPost> {
      const content = input.content.trim();
      if (!content && !input.workoutSessionId && !input.programId && !input.gymId) throw new Error('POST_EMPTY');
      if (content.length > 2000) throw new Error('POST_CONTENT_TOO_LONG');
      if (!visibilityValues.includes(input.visibility)) throw new Error('INVALID_VISIBILITY');
      await validateReferences(input);
      const now = Date.now();
      const post: SocialPost = { id: input.id ?? generateId(), authorUserId: input.authorUserId, content, workoutSessionId: input.workoutSessionId ?? null, programId: input.programId ?? null, gymId: input.gymId ?? null, visibility: input.visibility, status: 'active', createdAt: now, updatedAt: now };
      await store.social.createPost(post);
      return post;
    },
    async updatePost(input: { postId: string; authorUserId: string; content: string; visibility: SocialVisibility }): Promise<SocialPost> {
      const post = await store.social.getPost(input.postId);
      if (!post || post.status !== 'active' || post.authorUserId !== input.authorUserId) throw new Error('POST_NOT_FOUND');
      const content = input.content.trim();
      if (!content) throw new Error('POST_EMPTY');
      if (content.length > 2000) throw new Error('POST_CONTENT_TOO_LONG');
      if (!visibilityValues.includes(input.visibility)) throw new Error('INVALID_VISIBILITY');
      const next = { ...post, content, visibility: input.visibility, updatedAt: Math.max(Date.now(), post.updatedAt + 1) };
      await store.social.updatePost(next);
      return next;
    },
    async deletePost(input: { postId: string; authorUserId: string }): Promise<void> {
      const post = await store.social.getPost(input.postId);
      if (!post || post.status !== 'active' || post.authorUserId !== input.authorUserId) throw new Error('POST_NOT_FOUND');
      await store.social.updatePost({ ...post, status: 'deleted', updatedAt: Math.max(Date.now(), post.updatedAt + 1) });
    },
    async getPost(input: { postId: string; viewerUserId: string }): Promise<SocialPost> { return requireReadable(input.postId, input.viewerUserId); },
    async followUser(input: Omit<SocialFollow, 'createdAt'>): Promise<void> {
      if (input.followerUserId === input.followedUserId) throw new Error('SELF_FOLLOW');
      await Promise.all([requireActiveUser(input.followerUserId), requireActiveUser(input.followedUserId)]);
      if (!await isFollowing(input.followerUserId, input.followedUserId)) await store.social.createFollow({ ...input, createdAt: Date.now() });
    },
    async unfollowUser(input: Omit<SocialFollow, 'createdAt'>): Promise<void> { await store.social.deleteFollow(input.followerUserId, input.followedUserId); },
    async isFollowing(input: Omit<SocialFollow, 'createdAt'>): Promise<boolean> { return isFollowing(input.followerUserId, input.followedUserId); },
    async listFollowerRelationships(userId: string): Promise<SocialFollow[]> {
      return (await store.social.listFollows())
        .filter(item => item.followedUserId === userId)
        .sort((left, right) => right.createdAt - left.createdAt || left.followerUserId.localeCompare(right.followerUserId));
    },
    async listFollowingRelationships(userId: string): Promise<SocialFollow[]> {
      return (await store.social.listFollows())
        .filter(item => item.followerUserId === userId)
        .sort((left, right) => right.createdAt - left.createdAt || left.followedUserId.localeCompare(right.followedUserId));
    },
    async listPostsByUser(input: { userId: string; viewerUserId: string }): Promise<SocialPost[]> {
      const visible = await Promise.all((await store.social.listPosts()).filter(post => post.authorUserId === input.userId).map(async post => await canRead(post, input.viewerUserId) ? post : null));
      return visible.filter((post): post is SocialPost => post != null).sort(compareNewest);
    },
    async canViewerAccessProgramShare(input: { viewerUserId: string; programId: string }): Promise<boolean> {
      const candidates = (await store.social.listPosts()).filter(post => post.programId === input.programId);
      return (await Promise.all(candidates.map(post => canRead(post, input.viewerUserId)))).some(Boolean);
    },
    async canViewerAccessWorkoutShare(input: { viewerUserId: string; workoutSessionId: string }): Promise<boolean> {
      const candidates = (await store.social.listPosts()).filter(post => post.workoutSessionId === input.workoutSessionId);
      return (await Promise.all(candidates.map(post => canRead(post, input.viewerUserId)))).some(Boolean);
    },
    async likePost(input: { userId: string; postId: string }): Promise<void> { await requireActiveUser(input.userId); await requireReadable(input.postId, input.userId); await store.social.createLike({ ...input, createdAt: Date.now() }); },
    async unlikePost(input: { userId: string; postId: string }): Promise<void> { await store.social.deleteLike(input.userId, input.postId); },
    async savePost(input: { userId: string; postId: string }): Promise<void> { await requireActiveUser(input.userId); await requireReadable(input.postId, input.userId); await store.social.createSavedPost({ ...input, createdAt: Date.now() }); },
    async unsavePost(input: { userId: string; postId: string }): Promise<void> { await store.social.deleteSavedPost(input.userId, input.postId); },
    async listSavedPosts(userId: string): Promise<SocialPost[]> {
      const posts = await Promise.all((await store.social.listSavedPosts(userId)).map(async saved => { const post = await store.social.getPost(saved.postId); return post && await canRead(post, userId) ? post : null; }));
      return posts.filter((post): post is SocialPost => post != null).sort(compareNewest);
    },
    async createComment(input: { id?: string; postId: string; authorUserId: string; content: string }): Promise<SocialComment> {
      await requireActiveUser(input.authorUserId);
      await requireReadable(input.postId, input.authorUserId);
      const content = input.content.trim();
      if (!content) throw new Error('COMMENT_EMPTY');
      if (content.length > 1000) throw new Error('COMMENT_CONTENT_TOO_LONG');
      const now = Date.now();
      const comment: SocialComment = { id: input.id ?? generateId(), postId: input.postId, authorUserId: input.authorUserId, content, status: 'active', createdAt: now, updatedAt: now };
      await store.social.createComment(comment);
      return comment;
    },
    async listComments(input: { postId: string; viewerUserId: string }): Promise<SocialComment[]> {
      await requireReadable(input.postId, input.viewerUserId);
      return (await store.social.listComments(input.postId)).filter(comment => comment.status === 'active').sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id));
    },
    async deleteComment(input: { commentId: string; postId: string; authorUserId: string }): Promise<void> {
      const comment = (await store.social.listComments(input.postId)).find(item => item.id === input.commentId);
      if (!comment || comment.status !== 'active' || comment.authorUserId !== input.authorUserId) throw new Error('COMMENT_NOT_FOUND');
      await store.social.updateComment({ ...comment, status: 'deleted', updatedAt: Math.max(Date.now(), comment.updatedAt + 1) });
    },
    async listPublicFeed(input: { viewerUserId: string; cursor?: FeedCursor | null; limit?: number }): Promise<FeedPage> {
      const posts = await Promise.all((await store.social.listPosts()).filter(post => post.status === 'active' && post.visibility === 'public').map(async post => await users.getPublicUserSummary(post.authorUserId) ? post : null));
      return page(posts.filter((post): post is SocialPost => post != null), input);
    },
    async listFollowingFeed(input: { viewerUserId: string; cursor?: FeedCursor | null; limit?: number }): Promise<FeedPage> {
      const following = new Set((await store.social.listFollows()).filter(item => item.followerUserId === input.viewerUserId).map(item => item.followedUserId));
      const candidates = (await store.social.listPosts()).filter(post => post.authorUserId === input.viewerUserId || following.has(post.authorUserId));
      const visible = await Promise.all(candidates.map(async post => await canRead(post, input.viewerUserId) ? post : null));
      return page(visible.filter((post): post is SocialPost => post != null), input);
    },
    async getPostView(input: { postId: string; viewerUserId: string }): Promise<SocialPostView> {
      const post = await requireReadable(input.postId, input.viewerUserId);
      const [author, workout, program, gym, likes, comments, saves] = await Promise.all([
        users.getPublicUserSummary(post.authorUserId),
        post.workoutSessionId ? workouts.getWorkoutShareSummary(post.workoutSessionId) : null,
        post.programId ? programs.getProgramShareSummary(post.programId) : null,
        post.gymId ? gyms.getGym(post.gymId) : null,
        store.social.listLikes(), store.social.listComments(post.id), store.social.listSavedPosts(input.viewerUserId),
      ]);
      if (!author) throw new Error('POST_NOT_FOUND');
      return { post, author, workout, program, gym: gym ? { id: gym.id, name: gym.name, address: gym.address ?? null } : null, likeCount: likes.filter(item => item.postId === post.id).length, commentCount: comments.filter(item => item.status === 'active').length, viewerHasLiked: likes.some(item => item.userId === input.viewerUserId && item.postId === post.id), viewerHasSaved: saves.some(item => item.postId === post.id) };
    },
    async getProfileSocialStats(userId: string): Promise<ProfileSocialStats> {
      const [posts, follows] = await Promise.all([store.social.listPosts(), store.social.listFollows()]);
      return { postCount: posts.filter(post => post.authorUserId === userId && post.status === 'active').length, followerCount: follows.filter(item => item.followedUserId === userId).length, followingCount: follows.filter(item => item.followerUserId === userId).length };
    },
  };
}
