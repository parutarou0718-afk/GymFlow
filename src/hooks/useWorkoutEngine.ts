// ========================================
// GymFlow - Workout Engine Hook
// High-cohesion: Contains all training state & logic
// Low-coupling: Talks only to store interface
// ========================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { generateId, calculateVolume } from '../lib/utils';
import { completeSession, pauseSession, resumeSession } from '../lib/workout-lifecycle';
import { useStores } from '../db/stores';
import type { Exercise, WorkoutTemplate, WorkoutSession, WorkoutSnapshot } from '../types';

export interface UseWorkoutEngineOptions {
  template?: WorkoutTemplate;
  existingSessionId?: string;
  onFinish: () => void;
}

export interface UseWorkoutEngineReturn {
  session: WorkoutSession | null;
  elapsed: number;
  isPaused: boolean;
  saving: boolean;
  handleSetUpdate: (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) => Promise<void>;
  toggleSetComplete: (exerciseId: string, setIndex: number) => Promise<void>;
  addExercise: (exercise: Exercise) => Promise<void>;
  removeExercise: (exerciseId: string) => Promise<void>;
  addSet: (exerciseId: string) => Promise<void>;
  removeSet: (exerciseId: string, setIndex: number) => Promise<void>;
  handlePause: () => Promise<void>;
  handleResume: () => Promise<void>;
  handleFinish: () => Promise<void>;
  handleDiscard: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

export function useWorkoutEngine({
  template,
  existingSessionId,
  onFinish,
}: UseWorkoutEngineOptions): UseWorkoutEngineReturn {
  const { sessions, sync, events } = useStores();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // ── Initialize session ──
  useEffect(() => {
    const init = async () => {
      if (existingSessionId) {
        const s = await sessions.get(existingSessionId);
        if (s) {
          setSession(s);
          setElapsed(Math.floor((Date.now() - s.startedAt) / 1000));
          if (s.status === 'paused') setIsPaused(true);
        }
      } else {
        const newSession: WorkoutSession = {
          id: generateId(),
          templateId: template?.id || null,
          templateName: template?.name || 'Quick Workout',
          status: 'active',
          startedAt: Date.now(),
          sourceType: template ? 'template' : 'quick',
          sourceId: template?.id || null,
          gymId: null,
          visibility: 'private',
          exercises: (template?.exercises || []).map(ex => ({
            id: generateId(),
            exerciseId: ex.exerciseId,
            exercise: ex.exercise,
            order: ex.order,
            sets: ex.targetSets.map((ts, i) => ({
              setIndex: i,
              weight: ts.weight,
              reps: ts.reps,
              completed: false,
            })),
          })),
          pausedDuration: 0,
        };
        await sessions.create(newSession);
        await events.record({ id: generateId(), eventType: 'WORKOUT_STARTED', entityType: 'workout', entityId: newSession.id, createdAt: newSession.startedAt, payload: { sourceType: newSession.sourceType } });
        setSession(newSession);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer ──
  useEffect(() => {
    if (!session || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, isPaused]);

  // ── AppState auto-pause ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextState => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/) && session && !isPaused) {
        await handlePause();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isPaused]);

  // ── Set update ──
  const handleSetUpdate = useCallback(
    async (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) => {
      if (!session) return;
      const updated: WorkoutSession = {
        ...session,
        exercises: session.exercises.map(ex =>
          ex.id !== exerciseId
            ? ex
            : { ...ex, sets: ex.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)) }
        ),
      };
      setSession(updated);
      await sessions.updateSet(exerciseId, setIndex, { [field]: value });
    },
    [session, sessions]
  );

  // ── Toggle set completion ──
  const toggleSetComplete = useCallback(
    async (exerciseId: string, setIndex: number) => {
      if (!session) return;
      const newCompleted = !session.exercises.find(e => e.id === exerciseId)?.sets[setIndex]?.completed;
      if (newCompleted === undefined) return;
      const updated: WorkoutSession = {
        ...session,
        exercises: session.exercises.map(e =>
          e.id !== exerciseId
            ? e
            : { ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...s, completed: newCompleted } : s)) }
        ),
      };
      setSession(updated);
      await sessions.updateSet(exerciseId, setIndex, { completed: newCompleted });
    },
    [session, sessions]
  );

  const addExercise = useCallback(async (exercise: Exercise) => {
    if (!session || saving) return;
    const item = { id: generateId(), exerciseId: exercise.id, exercise, order: session.exercises.length, sets: [] };
    await sessions.addExercise(session.id, item);
    setSession({ ...session, exercises: [...session.exercises, item] });
  }, [session, sessions]);

  const removeExercise = useCallback(async (exerciseId: string) => {
    if (!session) return;
    await sessions.removeExercise(session.id, exerciseId);
    setSession({ ...session, exercises: session.exercises.filter(exercise => exercise.id !== exerciseId) });
  }, [session, sessions]);

  const addSet = useCallback(async (exerciseId: string) => {
    if (!session) return;
    const exercise = session.exercises.find(item => item.id === exerciseId);
    if (!exercise) return;
    const set = { setIndex: exercise.sets.length, weight: 0, reps: 0, completed: false };
    await sessions.addSet(exerciseId, set);
    setSession({ ...session, exercises: session.exercises.map(item => item.id === exerciseId ? { ...item, sets: [...item.sets, set] } : item) });
  }, [session, sessions]);

  const removeSet = useCallback(async (exerciseId: string, setIndex: number) => {
    if (!session) return;
    await sessions.removeSet(exerciseId, setIndex);
    setSession({ ...session, exercises: session.exercises.map(item => item.id === exerciseId ? { ...item, sets: item.sets.filter(set => set.setIndex !== setIndex) } : item) });
  }, [session, sessions]);

  // ── Pause / Resume ──
  const handlePause = useCallback(async () => {
    if (!session) return;
    const next = pauseSession(session, Date.now());
    if (next === session) return;
    await sessions.updateStatus(session.id, next.status, { pausedAt: next.pausedAt });
    await events.record({ id: generateId(), eventType: 'WORKOUT_PAUSED', entityType: 'workout', entityId: session.id, createdAt: next.pausedAt!, payload: {} });
    setSession({ ...session, ...next });
    setIsPaused(true);
  }, [session, sessions, events]);

  const handleResume = useCallback(async () => {
    if (!session) return;
    const next = resumeSession(session, Date.now());
    if (next === session) return;
    await sessions.updateStatus(session.id, next.status, { pausedAt: undefined, pausedDuration: next.pausedDuration });
    await events.record({ id: generateId(), eventType: 'WORKOUT_RESUMED', entityType: 'workout', entityId: session.id, createdAt: Date.now(), payload: {} });
    setSession({ ...session, ...next });
    setIsPaused(false);
  }, [session, sessions, events]);

  // ── Finish workout ──
  const handleFinish = useCallback(async () => {
    if (!session) return;
    setSaving(true);

    const completed = completeSession(session, Date.now(), session.startedAt);
    const totalVolume = calculateVolume(session.exercises.flatMap(e => e.sets));

    await sessions.updateStatus(session.id, 'completed', {
      finishedAt: completed.completedAt,
      completedAt: completed.completedAt,
      pausedAt: undefined,
      duration: completed.duration,
      totalVolume,
      pausedDuration: completed.pausedDuration,
    });

    const snapshot: WorkoutSnapshot = {
      schemaVersion: 1,
      sessionId: session.id,
      planId: session.templateId,
      startedAt: session.startedAt,
      finishedAt: completed.completedAt || null,
      exercises: session.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        order: ex.order,
        sets: ex.sets.map(s => ({
          weight: s.weight,
          reps: s.reps,
          completed: s.completed,
        })),
      })),
      totalVolume,
      duration: completed.duration || 0,
    };

    await sync.saveSnapshot(session.id, snapshot);
    await events.record({ id: generateId(), eventType: 'WORKOUT_COMPLETED', entityType: 'workout', entityId: session.id, createdAt: completed.completedAt!, payload: { totalVolume } });
    setSaving(false);
    onFinish();
  }, [session, saving, onFinish, sessions, sync, events]);

  const handleDiscard = useCallback(async () => {
    if (!session || saving) return;
    setSaving(true);
    await sessions.updateStatus(session.id, 'discarded');
    await events.record({ id: generateId(), eventType: 'WORKOUT_DISCARDED', entityType: 'workout', entityId: session.id, createdAt: Date.now(), payload: {} });
    setSaving(false);
    onFinish();
  }, [session, saving, sessions, events, onFinish]);

  // ── Utility ──
  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  return {
    session,
    elapsed,
    isPaused,
    saving,
    handleSetUpdate,
    toggleSetComplete,
    addExercise,
    removeExercise,
    addSet,
    removeSet,
    handlePause,
    handleResume,
    handleFinish,
    handleDiscard,
    formatTime,
  };
}
