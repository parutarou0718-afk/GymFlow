// ========================================
// GymFlow - Workout Engine Hook
// UI coordination over the Workout module public API
// ========================================

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { useStores } from '../db/stores';
import { createWorkoutService } from '../modules/workout';
import type { Exercise, WorkoutSession } from '../modules/workout';

export interface UseWorkoutEngineOptions {
  templateId?: string;
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
  refresh: () => Promise<void>;
  formatTime: (seconds: number) => string;
}

export function useWorkoutEngine({ templateId, existingSessionId, onFinish }: UseWorkoutEngineOptions): UseWorkoutEngineReturn {
  const store = useStores();
  const workoutService = useMemo(() => createWorkoutService(store), [store]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const init = async () => {
      const loaded = existingSessionId
        ? await workoutService.getWorkout(existingSessionId)
        : templateId
          ? await workoutService.startWorkoutFromTemplate(templateId)
          : await workoutService.startQuickWorkout();
      if (!loaded) return;
      setSession(loaded);
      setElapsed(Math.floor((Date.now() - loaded.startedAt) / 1000));
      setIsPaused(loaded.status === 'paused');
    };
    void init();
  }, [existingSessionId, templateId, workoutService]);

  useEffect(() => {
    if (!session || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = setInterval(() => setElapsed(previous => previous + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session, isPaused]);

  const handlePause = useCallback(async () => {
    if (!session || saving) return;
    setSession(await workoutService.pauseWorkout(session.id));
    setIsPaused(true);
  }, [session, saving, workoutService]);

  const handleResume = useCallback(async () => {
    if (!session || saving) return;
    setSession(await workoutService.resumeWorkout(session.id));
    setIsPaused(false);
  }, [session, saving, workoutService]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextState => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/) && session && !isPaused) {
        await handlePause();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [session, isPaused, handlePause]);

  const handleSetUpdate = useCallback(async (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number) => {
    if (!session || saving) return;
    setSession(await workoutService.updateSet(session.id, exerciseId, setIndex, { [field]: value }));
  }, [session, saving, workoutService]);

  const toggleSetComplete = useCallback(async (exerciseId: string, setIndex: number) => {
    if (!session || saving) return;
    const completed = !session.exercises.find(exercise => exercise.id === exerciseId)?.sets[setIndex]?.completed;
    if (completed === undefined) return;
    setSession(await workoutService.updateSet(session.id, exerciseId, setIndex, { completed }));
  }, [session, saving, workoutService]);

  const addExercise = useCallback(async (exercise: Exercise) => {
    if (!session || saving) return;
    setSession(await workoutService.addExercise(session.id, exercise));
  }, [session, saving, workoutService]);

  const removeExercise = useCallback(async (exerciseId: string) => {
    if (!session || saving) return;
    setSession(await workoutService.removeExercise(session.id, exerciseId));
  }, [session, saving, workoutService]);

  const addSet = useCallback(async (exerciseId: string) => {
    if (!session || saving) return;
    setSession(await workoutService.addSet(session.id, exerciseId));
  }, [session, saving, workoutService]);

  const removeSet = useCallback(async (exerciseId: string, setIndex: number) => {
    if (!session || saving) return;
    setSession(await workoutService.removeSet(session.id, exerciseId, setIndex));
  }, [session, saving, workoutService]);

  const handleFinish = useCallback(async () => {
    if (!session || saving) return;
    setSaving(true);
    try {
      await workoutService.finishWorkout(session.id);
      onFinish();
    } finally {
      setSaving(false);
    }
  }, [session, saving, workoutService, onFinish]);

  const handleDiscard = useCallback(async () => {
    if (!session || saving) return;
    setSaving(true);
    try {
      await workoutService.discardWorkout(session.id);
      onFinish();
    } finally {
      setSaving(false);
    }
  }, [session, saving, workoutService, onFinish]);

  const refresh = useCallback(async () => {
    if (!session) return;
    setSession(await workoutService.getWorkout(session.id));
  }, [session, workoutService]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  }, []);

  return {
    session, elapsed, isPaused, saving,
    handleSetUpdate, toggleSetComplete, addExercise, removeExercise, addSet, removeSet,
    handlePause, handleResume, handleFinish, handleDiscard, formatTime,
    refresh,
  };
}
