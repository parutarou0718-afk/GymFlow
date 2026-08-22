// ========================================
// GymFlow - Exercise Database Service
// ========================================

import type { Exercise } from '../types';

// Minimal embedded exercise DB for offline-first
// Full exercise data will be loaded from free-exercise-db on first sync
// This is a curated subset of the most common strength training exercises

const EMBEDDED_EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench_press', name: 'Bench Press', force: 'push', level: 'beginner', mechanic: 'compound', equipment: 'barbell', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'], instructions: ['Lie on a flat bench, grip the bar slightly wider than shoulder width.', 'Lower the bar to your chest.', 'Press the bar back up to lockout.'], category: 'strength', images: [] },
  { id: 'incline_bench_press', name: 'Incline Bench Press', force: 'push', level: 'intermediate', mechanic: 'compound', equipment: 'barbell', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'], instructions: ['Set bench to 30-45 degree incline.', 'Press the bar from upper chest to lockout.'], category: 'strength', images: [] },
  { id: 'dumbbell_fly', name: 'Dumbbell Fly', force: 'push', level: 'beginner', mechanic: 'isolation', equipment: 'dumbbell', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'], instructions: ['Lie on a flat bench with dumbbells.', 'Lower arms out to sides with slight bend in elbows.', 'Bring dumbbells back together at the top.'], category: 'strength', images: [] },
  { id: 'push_up', name: 'Push Up', force: 'push', level: 'beginner', mechanic: 'compound', equipment: 'body only', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'], instructions: ['Start in plank position with hands shoulder width.', 'Lower chest to the ground.', 'Push back up to starting position.'], category: 'strength', images: [] },
  { id: 'dumbbell_bench_press', name: 'Dumbbell Bench Press', force: 'push', level: 'beginner', mechanic: 'compound', equipment: 'dumbbell', primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'], instructions: ['Lie on flat bench with dumbbells at chest height.', 'Press dumbbells up until arms are extended.', 'Lower dumbbells back down.'], category: 'strength', images: [] },

  // Back
  { id: 'deadlift', name: 'Deadlift', force: 'pull', level: 'intermediate', mechanic: 'compound', equipment: 'barbell', primaryMuscles: ['lower back'], secondaryMuscles: ['glutes', 'hamstrings', 'traps', 'forearms'], instructions: ['Stand with feet hip-width, bar over mid-foot.', 'Bend at hips and knees, grip the bar.', 'Drive through heels to stand up straight.', 'Lower the bar with control.'], category: 'strength', images: [] },
  { id: 'pull_up', name: 'Pull Up', force: 'pull', level: 'intermediate', mechanic: 'compound', equipment: 'body only', primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'middle back'], instructions: ['Grip pull-up bar with palms facing away.', 'Pull yourself up until chin is over the bar.', 'Lower yourself with control.'], category: 'strength', images: [] },
  { id: 'barbell_row', name: 'Barbell Row', force: 'pull', level: 'intermediate', mechanic: 'compound', equipment: 'barbell', primaryMuscles: ['middle back'], secondaryMuscles: ['biceps', 'lats'], instructions: ['Bend at hips, keep back straight, grip barbell.', 'Pull barbell to your lower ribcage.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'lat_pulldown', name: 'Lat Pulldown', force: 'pull', level: 'beginner', mechanic: 'compound', equipment: 'cable', primaryMuscles: ['lats'], secondaryMuscles: ['biceps', 'middle back'], instructions: ['Sit at lat pulldown machine, grip bar wide.', 'Pull bar down to your upper chest.', 'Return slowly.'], category: 'strength', images: [] },
  { id: 'seated_cable_row', name: 'Seated Cable Row', force: 'pull', level: 'beginner', mechanic: 'compound', equipment: 'cable', primaryMuscles: ['middle back'], secondaryMuscles: ['biceps', 'lats'], instructions: ['Sit at cable row station, feet on platform.', 'Pull handle to your stomach.', 'Return with control.'], category: 'strength', images: [] },
  { id: 'dumbbell_row', name: 'Dumbbell Row', force: 'pull', level: 'beginner', mechanic: 'compound', equipment: 'dumbbell', primaryMuscles: ['middle back'], secondaryMuscles: ['biceps', 'lats'], instructions: ['Place knee and hand on bench, other foot on floor.', 'Pull dumbbell to your hip.', 'Lower with control.'], category: 'strength', images: [] },

  // Shoulders
  { id: 'overhead_press', name: 'Overhead Press', force: 'push', level: 'intermediate', mechanic: 'compound', equipment: 'barbell', primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'], instructions: ['Stand with barbell at shoulder height.', 'Press bar overhead until arms are extended.', 'Lower back to shoulders.'], category: 'strength', images: [] },
  { id: 'dumbbell_shoulder_press', name: 'Dumbbell Shoulder Press', force: 'push', level: 'beginner', mechanic: 'compound', equipment: 'dumbbell', primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'], instructions: ['Sit or stand with dumbbells at shoulder height.', 'Press dumbbells overhead.', 'Lower back down.'], category: 'strength', images: [] },
  { id: 'lateral_raise', name: 'Lateral Raise', force: 'push', level: 'beginner', mechanic: 'isolation', equipment: 'dumbbell', primaryMuscles: ['shoulders'], secondaryMuscles: [], instructions: ['Stand with dumbbells at sides.', 'Raise arms out to sides until parallel to floor.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'front_raise', name: 'Front Raise', force: 'push', level: 'beginner', mechanic: 'isolation', equipment: 'dumbbell', primaryMuscles: ['shoulders'], secondaryMuscles: [], instructions: ['Stand with dumbbells in front of thighs.', 'Raise arms forward to shoulder height.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'face_pull', name: 'Face Pull', force: 'pull', level: 'beginner', mechanic: 'compound', equipment: 'cable', primaryMuscles: ['shoulders'], secondaryMuscles: ['traps'], instructions: ['Set cable to upper chest height with rope.', 'Pull towards face, separating the rope.', 'Return slowly.'], category: 'strength', images: [] },

  // Arms
  { id: 'barbell_curl', name: 'Barbell Curl', force: 'pull', level: 'beginner', mechanic: 'isolation', equipment: 'barbell', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'], instructions: ['Stand with barbell, palms facing up.', 'Curl bar to shoulders.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'dumbbell_curl', name: 'Dumbbell Curl', force: 'pull', level: 'beginner', mechanic: 'isolation', equipment: 'dumbbell', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'], instructions: ['Stand with dumbbells at sides.', 'Curl dumbbells to shoulders.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'triceps_pushdown', name: 'Triceps Pushdown', force: 'push', level: 'beginner', mechanic: 'isolation', equipment: 'cable', primaryMuscles: ['triceps'], secondaryMuscles: [], instructions: ['Stand at cable machine with rope/bar.', 'Push down until arms are straight.', 'Return slowly.'], category: 'strength', images: [] },
  { id: 'skull_crusher', name: 'Skull Crusher', force: 'push', level: 'intermediate', mechanic: 'isolation', equipment: 'barbell', primaryMuscles: ['triceps'], secondaryMuscles: [], instructions: ['Lie on bench with bar above chest.', 'Lower bar to forehead by bending elbows.', 'Extend back to start.'], category: 'strength', images: [] },
  { id: 'hammer_curl', name: 'Hammer Curl', force: 'pull', level: 'beginner', mechanic: 'isolation', equipment: 'dumbbell', primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'], instructions: ['Stand with dumbbells, palms facing each other.', 'Curl dumbbells keeping palms facing in.', 'Lower with control.'], category: 'strength', images: [] },

  // Legs
  { id: 'squat', name: 'Barbell Squat', force: 'push', level: 'intermediate', mechanic: 'compound', equipment: 'barbell', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'hamstrings', 'lower back'], instructions: ['Position bar on upper back, stand with feet shoulder width.', 'Squat down until thighs are parallel to ground.', 'Drive through heels to stand up.'], category: 'strength', images: [] },
  { id: 'leg_press', name: 'Leg Press', force: 'push', level: 'beginner', mechanic: 'compound', equipment: 'machine', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'hamstrings'], instructions: ['Sit in leg press machine, feet shoulder width.', 'Push platform away until legs are extended.', 'Return slowly.'], category: 'strength', images: [] },
  { id: 'romanian_deadlift', name: 'Romanian Deadlift', force: 'pull', level: 'intermediate', mechanic: 'compound', equipment: 'barbell', primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes', 'lower back'], instructions: ['Hold barbell at hip height.', 'Hinge at hips, lower bar along legs.', 'Squeeze glutes to return to start.'], category: 'strength', images: [] },
  { id: 'leg_extension', name: 'Leg Extension', force: 'push', level: 'beginner', mechanic: 'isolation', equipment: 'machine', primaryMuscles: ['quadriceps'], secondaryMuscles: [], instructions: ['Sit in leg extension machine.', 'Extend legs until straight.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'leg_curl', name: 'Leg Curl', force: 'pull', level: 'beginner', mechanic: 'isolation', equipment: 'machine', primaryMuscles: ['hamstrings'], secondaryMuscles: [], instructions: ['Lie face down on leg curl machine.', 'Curl heels towards glutes.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'goblet_squat', name: 'Goblet Squat', force: 'push', level: 'beginner', mechanic: 'compound', equipment: 'dumbbell', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'hamstrings'], instructions: ['Hold dumbbell at chest.', 'Squat down, keeping chest upright.', 'Drive through heels to stand.'], category: 'strength', images: [] },
  { id: 'lunge', name: 'Lunge', force: 'push', level: 'beginner', mechanic: 'compound', equipment: 'body only', primaryMuscles: ['quadriceps'], secondaryMuscles: ['glutes', 'hamstrings'], instructions: ['Step forward with one leg.', 'Lower hips until both knees are at 90 degrees.', 'Push off front foot to return.'], category: 'strength', images: [] },
  { id: 'calf_raise', name: 'Calf Raise', force: 'push', level: 'beginner', mechanic: 'isolation', equipment: 'body only', primaryMuscles: ['calves'], secondaryMuscles: [], instructions: ['Stand on edge of step.', 'Raise heels as high as possible.', 'Lower below step level.'], category: 'strength', images: [] },

  // Core
  { id: 'crunch', name: 'Crunch', force: 'pull', level: 'beginner', mechanic: 'isolation', equipment: 'body only', primaryMuscles: ['abdominals'], secondaryMuscles: [], instructions: ['Lie on back, knees bent, hands behind head.', 'Curl shoulders off the ground.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'plank', name: 'Plank', force: 'isometric', level: 'beginner', mechanic: 'isolation', equipment: 'body only', primaryMuscles: ['abdominals'], secondaryMuscles: ['shoulders'], instructions: ['Start in push-up position on forearms.', 'Hold body in straight line.', 'Breathe and hold.'], category: 'strength', images: [] },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raise', force: 'pull', level: 'intermediate', mechanic: 'compound', equipment: 'body only', primaryMuscles: ['abdominals'], secondaryMuscles: ['hip flexors'], instructions: ['Hang from pull-up bar.', 'Raise legs until parallel to ground.', 'Lower with control.'], category: 'strength', images: [] },
  { id: 'russian_twist', name: 'Russian Twist', force: 'pull', level: 'beginner', mechanic: 'isolation', equipment: 'body only', primaryMuscles: ['abdominals'], secondaryMuscles: ['obliques'], instructions: ['Sit with knees bent, lean back slightly.', 'Rotate torso side to side.', 'Optionally hold a weight.'], category: 'strength', images: [] },
];

class ExerciseDBService {
  private exercises: Map<string, Exercise> = new Map();
  private initialized = false;

  constructor() {
    for (const ex of EMBEDDED_EXERCISES) {
      this.exercises.set(ex.id, ex);
    }
    this.initialized = true;
  }

  getAll(): Exercise[] {
    return Array.from(this.exercises.values());
  }

  getById(id: string): Exercise | undefined {
    return this.exercises.get(id);
  }

  search(query: string): Exercise[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(
      ex =>
        ex.name.toLowerCase().includes(lower) ||
        ex.primaryMuscles.some(m => m.toLowerCase().includes(lower)) ||
        ex.equipment?.toLowerCase().includes(lower)
    );
  }

  getByMuscle(muscle: string): Exercise[] {
    return this.getAll().filter(
      ex =>
        ex.primaryMuscles.some(m => m.toLowerCase() === muscle.toLowerCase()) ||
        ex.secondaryMuscles.some(m => m.toLowerCase() === muscle.toLowerCase())
    );
  }

  getMuscleGroups(): string[] {
    const muscles = new Set<string>();
    for (const ex of this.getAll()) {
      ex.primaryMuscles.forEach(m => muscles.add(m));
    }
    return Array.from(muscles).sort();
  }

  // Load additional exercises from JSON (future: from free-exercise-db)
  async importFromJSON(data: Exercise[]): Promise<number> {
    let count = 0;
    for (const ex of data) {
      if (!this.exercises.has(ex.id)) {
        this.exercises.set(ex.id, ex);
        count++;
      }
    }
    return count;
  }
}

export const exerciseDB = new ExerciseDBService();
