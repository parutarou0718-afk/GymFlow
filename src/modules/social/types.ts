export type SocialVisibility = 'private' | 'followers' | 'public';
export interface SocialPost { id: string; authorUserId: string; content: string; workoutSessionId?: string | null; programId?: string | null; gymId?: string | null; visibility: SocialVisibility; status: 'active' | 'deleted'; createdAt: number; updatedAt: number; }
export interface SocialFollow { followerUserId: string; followedUserId: string; createdAt: number; }
export interface SocialLike { userId: string; postId: string; createdAt: number; }
export interface SavedPost { userId: string; postId: string; createdAt: number; }
export interface SocialComment { id: string; postId: string; authorUserId: string; content: string; status: 'active' | 'deleted'; createdAt: number; updatedAt: number; }
export interface CreateSocialPostInput { id?: string; authorUserId: string; content: string; workoutSessionId?: string | null; programId?: string | null; gymId?: string | null; visibility: SocialVisibility; }
export interface FeedCursor { createdAt: number; postId: string; }
export interface FeedPage { posts: SocialPost[]; nextCursor: FeedCursor | null; }
export interface SocialPostView {
  post: SocialPost;
  author: { id: string; displayName: string; avatarUri: string | null };
  workout: { id: string; date: number; duration: number; exerciseCount: number; volume: number; gymId: string | null } | null;
  program: { id: string; name: string; description: string; exerciseCount: number } | null;
  gym: { id: string; name: string; address?: string | null } | null;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  viewerHasSaved: boolean;
}
export interface ProfileSocialStats { postCount: number; followerCount: number; followingCount: number; }
