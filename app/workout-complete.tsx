import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Card, Metric } from "../src/components/ui";
import { useStores } from "../src/db/stores";
import { createExerciseService } from "../src/modules/exercise";
import { createGymService } from "../src/modules/gym";
import { createProgramService } from "../src/modules/program";
import {
  createWorkoutService,
  type WorkoutSession,
} from "../src/modules/workout";
import {
  formatCompletionDuration,
  getCompletedExerciseCount,
  getCompletedVolume,
  getReplacementCount,
} from "../src/lib/workout-completion-presentation";
import { colors, radius, spacing, typography } from "../src/lib/theme";
import { useCurrentUser } from '../src/modules/current-user';

type SummaryExercise = {
  id: string;
  name: string;
  completedSets: number;
  replacedFromName: string | null;
};

export default function WorkoutCompleteScreen() {
  const { user } = useCurrentUser();
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const store = useStores();
  const workoutService = useMemo(() => createWorkoutService(store), [store]);
  const gymService = useMemo(() => createGymService(store), [store]);
  const exerciseService = useMemo(() => createExerciseService(store), [store]);
  const programService = useMemo(() => createProgramService(store), [store]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [gymLabel, setGymLabel] = useState("Training location unavailable");
  const [programName, setProgramName] = useState<string | null>(null);
  const [exercises, setExercises] = useState<SummaryExercise[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    if (!sessionId || !user) {
      setLoading(false);
      return;
    }

    const completed = await workoutService.getWorkoutHistoryDetailForOwner(user.id, sessionId);
    if (!completed || completed.status !== "completed") {
      setLoading(false);
      return;
    }

    const [gym, program, resolvedExercises] = await Promise.all([
      completed.gymId ? gymService.getGym(completed.gymId) : null,
      completed.templateId
        ? programService.getProgramForOwner(user.id, completed.templateId)
        : null,
      Promise.all(
        completed.exercises
          .filter((exercise) => exercise.sets.some((set) => set.completed))
          .map(async (exercise) => {
            const [resolvedExercise, originalExercise] = await Promise.all([
              exerciseService.getExercise(exercise.exerciseId),
              exercise.replacedFromExerciseId
                ? exerciseService.getExercise(exercise.replacedFromExerciseId)
                : null,
            ]);
            return {
              id: exercise.id,
              name: resolvedExercise?.name ?? "Exercise unavailable",
              completedSets: exercise.sets.filter((set) => set.completed)
                .length,
              replacedFromName: exercise.replacedFromExerciseId
                ? (originalExercise?.name ?? "Original exercise unavailable")
                : null,
            };
          }),
      ),
    ]);

    setSession(completed);
    setGymLabel(
      completed.gymId
        ? (gym?.name ?? "Training location unavailable")
        : "No training location",
    );
    setProgramName(program?.name ?? completed.templateName ?? null);
    setExercises(resolvedExercises);
    setLoading(false);
  }, [exerciseService, gymService, programService, sessionId, user, workoutService]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (loading) return null;

  if (!session) {
    return (
      <View style={styles.unavailable}>
        <Text style={typography.h2}>Workout summary unavailable</Text>
        <Text style={[typography.bodySmall, styles.unavailableCopy]}>
          This workout has not been completed or is no longer available.
        </Text>
        <Button
          title="Home"
          onPress={() => router.replace("/(tabs)")}
          style={styles.unavailableAction}
        />
      </View>
    );
  }

  const volume = getCompletedVolume(session);
  const adjustments = getReplacementCount(session);
  const trainAgain = () => {
    if (session.templateId) {
      router.push({
        pathname: "/program-detail" as any,
        params: { programId: session.templateId },
      });
      return;
    }
    router.replace("/(tabs)");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Workout Complete</Text>
      <Text style={[typography.bodySmall, styles.subtitle]}>
        {session.templateName || "Workout"}
      </Text>

      <Card>
        <Text style={typography.caption}>Training location</Text>
        <Text style={[typography.h2, styles.gym]}>{gymLabel}</Text>
        <View style={styles.metrics}>
          <Metric
            label="Duration"
            value={formatCompletionDuration(
              session.startedAt,
              session.completedAt,
            )}
          />
          <Metric
            label="Exercises"
            value={String(getCompletedExerciseCount(session))}
          />
          <Metric label="Total volume" value={String(volume)} />
          <Metric label="Adjustments" value={String(adjustments)} />
        </View>
      </Card>

      <Text style={[typography.h3, styles.sectionTitle]}>Completed work</Text>
      {exercises.map((exercise) => (
        <Card key={exercise.id} style={styles.exerciseCard}>
          <Text style={typography.body}>{exercise.name}</Text>
          <Text style={typography.caption}>
            {exercise.completedSets} completed set
            {exercise.completedSets === 1 ? "" : "s"}
          </Text>
          {exercise.replacedFromName ? (
            <Text style={[typography.caption, styles.provenance]}>
              Replaced {exercise.replacedFromName}
            </Text>
          ) : null}
        </Card>
      ))}

      <Button
        title="View Workout"
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: "/session-detail" as any,
            params: { sessionId: session.id },
          })
        }
        style={styles.action}
      />
      <Button
        title={
          session.templateId
            ? `Train Again${programName ? `: ${programName}` : ""}`
            : "Start a Quick Workout"
        }
        onPress={trainAgain}
        style={styles.action}
      />
      <Button
        title="Home"
        variant="ghost"
        onPress={() => router.replace("/(tabs)")}
        style={styles.action}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    paddingTop: spacing["4xl"],
    paddingBottom: spacing["4xl"],
  },
  title: { ...typography.h1, color: colors.text },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    color: colors.textSecondary,
  },
  gym: { marginTop: spacing.xs },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  exerciseCard: { marginBottom: spacing.sm },
  provenance: { color: colors.textSecondary, marginTop: spacing.xs },
  action: { marginTop: spacing.sm },
  unavailable: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  unavailableCopy: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  unavailableAction: { marginTop: spacing.lg, alignSelf: "stretch" },
});
