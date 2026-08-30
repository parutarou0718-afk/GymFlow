import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useStores } from '../../src/db/stores';
import { createSocialService, type SocialPostView, type SocialVisibility } from '../../src/modules/social';
import { createUserService } from '../../src/modules/user';
import type { UserProfile } from '../../src/modules/user';
import { colors, spacing, typography } from '../../src/lib/theme';
import { Button, Card, SectionHeader } from '../../src/components/ui';

const visibilities: SocialVisibility[] = ['private', 'followers', 'public'];

export default function SocialScreen() {
  const store = useStores();
  const social = useMemo(() => createSocialService(store), [store]);
  const users = useMemo(() => createUserService(store), [store]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [posts, setPosts] = useState<SocialPostView[]>([]);
  const [otherUsers, setOtherUsers] = useState<UserProfile[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [content, setContent] = useState('');
  const [workoutSessionId, setWorkoutSessionId] = useState('');
  const [programId, setProgramId] = useState('');
  const [gymId, setGymId] = useState('');
  const [visibility, setVisibility] = useState<SocialVisibility>('public');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const current = await users.getCurrentUser();
    const page = await social.listPublicFeed({ viewerUserId: current.id, limit: 20 });
    const views = await Promise.all(page.posts.map(post => social.getPostView({ postId: post.id, viewerUserId: current.id })));
    setCurrentUserId(current.id); setPosts(views);
    setOtherUsers((await users.listUsers()).filter(user => user.id !== current.id));
  }, [social, users]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const publish = async () => {
    if (busy) return;
    try { setBusy(true); await social.createPost({ authorUserId: currentUserId, content, visibility, workoutSessionId: workoutSessionId.trim() || null, programId: programId.trim() || null, gymId: gymId.trim() || null }); setContent(''); setWorkoutSessionId(''); setProgramId(''); setGymId(''); await load(); setMessage('Post published'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish'); }
    finally { setBusy(false); }
  };
  const interact = async (action: () => Promise<void>) => {
    if (busy) return;
    try { setBusy(true); await action(); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update'); }
    finally { setBusy(false); }
  };
  const addTestUser = async () => {
    try { await users.createUser({ displayName: `Social tester ${Date.now()}` }); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create test user'); }
  };

  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: spacing['4xl'] }}>
    <View style={{ padding: spacing.lg, paddingTop: spacing['4xl'] }}><Text style={typography.h1}>Social</Text><Text style={typography.caption}>Development validation only. Chronological public feed.</Text></View>
    <Card style={{ marginHorizontal: spacing.lg }}><TextInput value={content} onChangeText={setContent} multiline placeholder="Share a training note (or attach one reference)" style={{ minHeight: 72, color: colors.text }} /><TextInput value={workoutSessionId} onChangeText={setWorkoutSessionId} placeholder="Own Workout ID (optional)" style={{ color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border }} /><TextInput value={programId} onChangeText={setProgramId} placeholder="Own Program ID (optional)" style={{ color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border }} /><TextInput value={gymId} onChangeText={setGymId} placeholder="Gym ID (optional)" style={{ color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border }} /><View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>{visibilities.map(item => <TouchableOpacity key={item} onPress={() => setVisibility(item)}><Text style={{ color: item === visibility ? colors.primary : colors.textSecondary }}>{item}</Text></TouchableOpacity>)}</View><Button title="Publish" onPress={() => void publish()} disabled={busy || (!content.trim() && !workoutSessionId.trim() && !programId.trim() && !gymId.trim())} loading={busy} style={{ marginTop: spacing.md }} /></Card>
    <SectionHeader title="Follow validation" subtitle="Create a local test user, then follow or unfollow." />
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}><Button title="Add test user" onPress={() => void addTestUser()} variant="secondary" />{otherUsers.map(user => <View key={user.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={typography.body}>{user.displayName}</Text><Button title="Follow" onPress={() => void interact(() => social.followUser({ followerUserId: currentUserId, followedUserId: user.id }))} variant="ghost" /></View>)}</View>
    {message ? <Text style={{ margin: spacing.lg, color: colors.textSecondary }}>{message}</Text> : null}
    <SectionHeader title="Public feed" subtitle="Newest first" />
    <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>{posts.map(view => <Card key={view.post.id}><Text style={typography.label}>{view.author.displayName}</Text><Text style={[typography.body, { marginTop: spacing.xs }]}>{view.post.content || 'Shared training reference'}</Text>{view.workout ? <Text style={typography.caption}>Workout · {view.workout.exerciseCount} exercises · {view.workout.volume} volume</Text> : null}{view.program ? <Text style={typography.caption}>Program · {view.program.name}</Text> : null}{view.gym ? <Text style={typography.caption}>Gym · {view.gym.name}</Text> : null}<View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}><TouchableOpacity onPress={() => void interact(() => view.viewerHasLiked ? social.unlikePost({ userId: currentUserId, postId: view.post.id }) : social.likePost({ userId: currentUserId, postId: view.post.id }))}><Text style={{ color: colors.primary }}>{view.viewerHasLiked ? 'Unlike' : 'Like'} ({view.likeCount})</Text></TouchableOpacity><TouchableOpacity onPress={() => void interact(() => view.viewerHasSaved ? social.unsavePost({ userId: currentUserId, postId: view.post.id }) : social.savePost({ userId: currentUserId, postId: view.post.id }))}><Text style={{ color: colors.primary }}>{view.viewerHasSaved ? 'Unsave' : 'Save'}</Text></TouchableOpacity><Text style={typography.caption}>{view.commentCount} comments</Text></View><View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}><TextInput value={commentDrafts[view.post.id] ?? ''} onChangeText={value => setCommentDrafts(current => ({ ...current, [view.post.id]: value }))} placeholder="Add comment" style={{ flex: 1, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.border }} /><Button title="Comment" variant="ghost" disabled={busy || !(commentDrafts[view.post.id] ?? '').trim()} onPress={() => void interact(async () => { await social.createComment({ postId: view.post.id, authorUserId: currentUserId, content: commentDrafts[view.post.id] ?? '' }); setCommentDrafts(current => ({ ...current, [view.post.id]: '' })); })} /></View></Card>)}</View>
  </ScrollView>;
}
