type PublicUserSummary = { id: string; displayName: string; avatarUri: string | null };

export function createSocialProfileService(dependencies: {
  users: { getPublicUserSummary(userId: string): Promise<PublicUserSummary | null> };
  social: {
    getProfileSocialStats(userId: string): Promise<{ postCount: number; followerCount: number; followingCount: number }>;
    isFollowing(input: { followerUserId: string; followedUserId: string }): Promise<boolean>;
    listPostsByUser(input: { userId: string; viewerUserId: string }): Promise<Array<{ id: string; programId?: string | null; workoutSessionId?: string | null }>>;
    listFollowerRelationships(userId: string): Promise<Array<{ followerUserId: string }>>;
    listFollowingRelationships(userId: string): Promise<Array<{ followedUserId: string }>>;
  };
}) {
  const publicUsers = async (userIds: string[]): Promise<PublicUserSummary[]> => {
    const users = await Promise.all(userIds.map(userId => dependencies.users.getPublicUserSummary(userId)));
    return users.filter((user): user is PublicUserSummary => user != null);
  };

  return {
    async getSocialProfile(input: { userId: string; viewerUserId: string }) {
      const user = await dependencies.users.getPublicUserSummary(input.userId);
      if (!user) throw new Error('PROFILE_NOT_FOUND');
      const [posts, stats, followerRelationships, followingRelationships] = await Promise.all([
        dependencies.social.listPostsByUser({ userId: input.userId, viewerUserId: input.viewerUserId }),
        dependencies.social.getProfileSocialStats(input.userId),
        dependencies.social.listFollowerRelationships(input.userId),
        dependencies.social.listFollowingRelationships(input.userId),
      ]);
      const [followerUsers, followingUsers] = await Promise.all([
        publicUsers(followerRelationships.map(item => item.followerUserId)),
        publicUsers(followingRelationships.map(item => item.followedUserId)),
      ]);
      return {
        user,
        socialStats: { ...stats, postCount: posts.length, followerCount: followerUsers.length, followingCount: followingUsers.length },
        viewerRelationship: {
          isSelf: input.userId === input.viewerUserId,
          isFollowing: input.userId !== input.viewerUserId && await dependencies.social.isFollowing({ followerUserId: input.viewerUserId, followedUserId: input.userId }),
        },
        posts,
        sharedProgramIds: [...new Set(posts.map(post => post.programId).filter(Boolean))],
        sharedWorkoutIds: [...new Set(posts.map(post => post.workoutSessionId).filter(Boolean))],
        followerUsers,
        followingUsers,
      };
    },
  };
}
