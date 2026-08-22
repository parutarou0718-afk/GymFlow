// ========================================
// GymFlow - Workout Engine Hook
// High-cohesion: Contains all training state & logic
// Low-coupling: Talks only to store interface
// ========================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { generateId, calculateVolume } from '../lib/utils';
import { useStores } from '../db/stores';
import type { WorkoutTemplate, WorkoutSession, WorkoutSnapshot } from '../types';

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
  handlePause: () => Promise<void>;
  handleResume: () => Promise<void>;
  handleFinish: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

export function useWorkoutEngine({
  template,
  existingSessionId,
  onFinish,
}: UseWorkoutEngineOptions): UseWorkoutEngineReturn {
  const { sessions, sync } = useStores();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [pausedTime, setPausedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseStartRef = useRef<number | null>(null);
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
      } else if (template) {
        const newSession: WorkoutSession = {
          id: generateId(),
          templateId: template.id,
          templateName: template.name,
          status: 'active',
          startedAt: Date.now(),
          exercises: template.exercises.map(ex => ({
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

  // ── Pause / Resume ──
  const handlePause = useCallback(async () => {
    if (!session) return;
    setIsPaused(true);
    pauseStartRef.current = Date.now();
    await sessions.updateStatus(session.id, 'paused');
  }, [session, sessions]);

  const handleResume = useCallback(async () => {
    if (!session || !pauseStartRef.current) return;
    const pauseDuration = Math.floor((Date.now() - pauseStartRef.current) / 1000);
    setPausedTime(prev => prev + pauseDuration);
    pauseStartRef.current = null;
    setIsPaused(false);
    await sessions.updateStatus(session.id, 'active', {
      pausedDuration: (session.pausedDuration || 0) + pauseDuration,
    });
  }, [session, sessions]);

  // ── Finish workout ──
  const handleFinish = useCallback(async () => {
    if (!session) return;
    setSaving(true);

    const finishedAt = Date.now();
    const totalDuration = Math.floor((finishedAt - session.startedAt) / 1000);
    const totalVolume = calculateVolume(session.exercises.flatMap(e => e.sets));

    await sessions.updateStatus(session.id, 'completed', {
      finishedAt,
      duration: totalDuration - pausedTime,
      totalVolume,
      pausedDuration: pausedTime,
    });

    const snapshot: WorkoutSnapshot = {
      schemaVersion: 1,
      sessionId: session.id,
      planId: session.templateId,
      startedAt: session.startedAt,
      finishedAt,
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
      duration: totalDuration - pausedTime,
    };

    await sync.saveSnapshot(session.id, snapshot);
    setSaving(false);
    onFinish();
  }, [session, pausedTime, onFinish, sessions, sync]);

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
    handlePause,
    handleResume,
    handleFinish,
    formatTime,
  };
}
