export type LifecycleStatus = 'draft' | 'active' | 'paused' | 'completed' | 'discarded';

export interface LifecycleState {
  status: LifecycleStatus;
  pausedAt?: number;
  pausedDuration?: number;
  completedAt?: number;
  duration?: number;
}

export function pauseSession(state: LifecycleState, now: number): LifecycleState {
  if (state.status !== 'active') return state;
  return { ...state, status: 'paused', pausedAt: now };
}

export function resumeSession(state: LifecycleState, now: number): LifecycleState {
  if (state.status !== 'paused' || state.pausedAt === undefined) return state;
  return {
    ...state,
    status: 'active',
    pausedAt: undefined,
    pausedDuration: (state.pausedDuration ?? 0) + now - state.pausedAt,
  };
}

export function completeSession(state: LifecycleState, now: number, startedAt: number): LifecycleState {
  const resumed = state.status === 'paused' ? resumeSession(state, now) : state;
  const pausedDuration = resumed.pausedDuration ?? 0;
  return {
    ...resumed,
    status: 'completed',
    completedAt: now,
    duration: Math.max(0, now - startedAt - pausedDuration),
  };
}
