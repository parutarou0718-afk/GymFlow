import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createSocialService } from '../../src/modules/social';
import { createSocialProfileService } from '../../src/modules/social-profile';
import { createUserService } from '../../src/modules/user';
import { Button, Card, SectionHeader } from '../../src/components/ui';
import { colors, spacing, typography } from '../../src/lib/theme';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const store = useStores();
  const users = useMemo(() => createUserService(store), [store]);
  const social = useMemo(() => createSocialService(store), [store]);
  const profiles = useMemo(() => createSocialProfileService({ users, social }), [social, users]);
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof profiles.getSocialProfile>> | null>(null);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const viewer = await users.getCurrentUser();
      setCurrent(viewer.id);
      if (userId) setProfile(await profiles.getSocialProfile({ userId, viewerUserId: viewer.id }));
    } catch { setMessage('Profile unavailable'); }
  }, [profiles, userId, users]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const follow = async () => {
    if (!profile || !userId) return;
    if (profile.viewerRelationship.isFollowing) await social.unfollowUser({ followerUserId: current, followedUserId: userId });
    else await social.followUser({ followerUserId: current, followedUserId: userId });
    await load();
  };

  if (!profile) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}><Text style={typography.body}>{message || 'Loading profile...'}</Text></View>;
  const goToUser = (id: string) => router.push({ pathname: '/users/[userId]' as any, params: { userId: id } });
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing['4xl'], paddingBottom: spacing['4xl'] }}>
    <Text style={typography.h1}>{profile.user.displayName}</Text>
    <Text style={typography.caption}>{profile.socialStats.postCount} posts · {profile.socialStats.followerCount} followers · {profile.socialStats.followingCount} following</Text>
    {!profile.viewerRelationship.isSelf ? <Button title={profile.viewerRelationship.isFollowing ? 'Unfollow' : 'Follow'} onPress={() => void follow()} style={{ marginTop: spacing.md }} /> : null}
    <SectionHeader title="Followers" />
    {profile.followerUsers.map(user => <TouchableOpacity key={user.id} onPress={() => goToUser(user.id)}><Text style={typography.body}>{user.displayName}</Text></TouchableOpacity>)}
    <SectionHeader title="Following" />
    {profile.followingUsers.map(user => <TouchableOpacity key={user.id} onPress={() => goToUser(user.id)}><Text style={typography.body}>{user.displayName}</Text></TouchableOpacity>)}
    <SectionHeader title="Posts" />
    {profile.posts.map(post => <Card key={post.id}><Text style={typography.caption}>{post.id}</Text>{post.programId ? <TouchableOpacity onPress={() => router.push({ pathname: '/shared-program' as any, params: { programId: post.programId! } })}><Text style={{ color: colors.primary }}>View shared Program</Text></TouchableOpacity> : null}{post.workoutSessionId ? <TouchableOpacity onPress={() => router.push({ pathname: '/shared-workout' as any, params: { sessionId: post.workoutSessionId! } })}><Text style={{ color: colors.primary }}>View shared Workout</Text></TouchableOpacity> : null}</Card>)}
  </ScrollView>;
}
