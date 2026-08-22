// ========================================
// GymFlow - Utility Functions
// ========================================

import type { WorkoutSession, CompletedSet } from '../types';

/**
 * Generate a UUID v4
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments where crypto.randomUUID is not available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculate total volume from completed sets
 */
export function calculateVolume(sets: CompletedSet[]): number {
  return sets
    .filter(s => s.completed)
    .reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/**
 * Calculate total volume for a session
 */
export function calculateSessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, ex) => sum + calculateVolume(ex.sets),
    0
  );
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Format weight display
 */
export function formatWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): string {
  return `${weight} ${unit}`;
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${hour}:${minute}`;
}

/**
 * Format short date (for history list)
 */
export function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const month = date.toLocaleString('default', { month: 'short' });
  const day = date.getDate();

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return `${month} ${day}`;
}

/**
 * Format volume for display
 */
export function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}t`;
  }
  return `${Math.round(volume)} kg`;
}
