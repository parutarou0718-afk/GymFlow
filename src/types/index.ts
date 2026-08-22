// ========================================
// GymFlow - Core Type Definitions
// Based on workout.cool schema + free-exercise-db
// ========================================

// --- UUID ---
export type UUID = string;

// --- Exercise (from free-exercise-db) ---
export interface Exercise {
  id: string;
  name: string;
  force: string | null;
  level: string;
  mechanic: string | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  images: string[];
}

// --- Workout Template ---
// A template represents a planned workout (e.g., "Push Day")
export interface WorkoutTemplate {
  id: UUID;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

export interface TemplateExercise {
  id: UUID;
  exerciseId: string; // reference to Exercise.id
  exercise?: Exercise; // populated on read
  order: number;
  targetSets: TargetSet[];
  notes?: string;
}

export interface TargetSet {
  setIndex: number; // 0-based
  reps: number;
  weight: number; // kg
  unit: 'kg' | 'lbs';
}

// --- Workout Session ---
export type SessionStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface WorkoutSession {
  id: UUID;
  templateId: UUID | null; // null if started without template
  templateName?: string; // snapshot name
  status: SessionStatus;
  startedAt: number;
  finishedAt?: number;
  exercises: SessionExercise[];
  totalVolume?: number; // computed: sum(weight * reps)
  duration?: number; // seconds
  pausedDuration?: number; // total paused time in seconds
}

export interface SessionExercise {
  id: UUID;
  exerciseId: string;
  exercise?: Exercise;
  order: number;
  sets: CompletedSet[];
  notes?: string;
}

export interface CompletedSet {
  setIndex: number;
  weight: number;
  reps: number;
  completed: boolean;
  rpe?: number; // future
  notes?: string; // future
}

// --- Workout Snapshot (for sync) ---
export interface WorkoutSnapshot {
  schemaVersion: number;
  sessionId: UUID;
  planId: UUID | null;
  startedAt: number;
  finishedAt: number | null;
  exercises: {
    exerciseId: string;
    order: number;
    sets: { weight: number; reps: number; completed: boolean }[];
  }[];
  totalVolume: number;
  duration: number;
}

// --- User Profile (local) ---
export interface UserProfile {
  id: UUID;
  email: string;
  name: string;
  avatar?: string;
  createdAt: number;
}

// --- Sync Queue ---
export interface SyncQueueItem {
  id: UUID;
  sessionId: UUID;
  snapshot: WorkoutSnapshot;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  createdAt: number;
  lastAttempt?: number;
  error?: string;
}
