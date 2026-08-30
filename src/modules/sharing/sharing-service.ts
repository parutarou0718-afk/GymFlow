import type { Program, ProgramService } from '../program';
import type { UserService } from '../user';

export function createSharingService(dependencies: {
  users: Pick<UserService, 'getPublicUserSummary'>;
  programs: Pick<ProgramService, 'getProgram' | 'copyProgram'>;
  workouts?: { getWorkoutShareSummary(sessionId: string): Promise<{ id: string; date: number; duration: number; exerciseCount: number; volume: number; gymId: string | null } | null> };
  social: { canViewerAccessProgramShare(input: { viewerUserId: string; programId: string }): Promise<boolean>; canViewerAccessWorkoutShare?(input: { viewerUserId: string; workoutSessionId: string }): Promise<boolean> };
}) {
  const canView = async (viewerUserId: string, program: Program) => program.ownerUserId === viewerUserId || await dependencies.social.canViewerAccessProgramShare({ viewerUserId, programId: program.id });
  const getSharedProgramView = async (input: { viewerUserId: string; programId: string }) => {
    const program = await dependencies.programs.getProgram(input.programId);
    if (!program || !await canView(input.viewerUserId, program)) throw new Error('SHARED_PROGRAM_NOT_AVAILABLE');
    const owner = program.ownerUserId ? await dependencies.users.getPublicUserSummary(program.ownerUserId) : null;
    if (!owner) throw new Error('SHARED_PROGRAM_NOT_AVAILABLE');
    return { program: { id: program.id, name: program.name, description: program.description ?? '', exercises: program.exercises.map(item => ({ id: item.id, exerciseId: item.exerciseId, order: item.order, targetSets: item.targetSets.map(set => ({ ...set })) })) }, owner };
  };
  return {
    getSharedProgramView,
    async copySharedProgram(input: { viewerUserId: string; sourceProgramId: string; name?: string }) {
      const view = await getSharedProgramView({ viewerUserId: input.viewerUserId, programId: input.sourceProgramId });
      return dependencies.programs.copyProgram({ sourceProgramId: view.program.id, newOwnerUserId: input.viewerUserId, name: input.name });
    },
    async getSharedWorkoutView(input: { viewerUserId: string; sessionId: string }) {
      if (!dependencies.workouts || !dependencies.social.canViewerAccessWorkoutShare || !await dependencies.social.canViewerAccessWorkoutShare({ viewerUserId: input.viewerUserId, workoutSessionId: input.sessionId })) throw new Error('SHARED_WORKOUT_NOT_AVAILABLE');
      const workout = await dependencies.workouts.getWorkoutShareSummary(input.sessionId);
      if (!workout) throw new Error('SHARED_WORKOUT_NOT_AVAILABLE');
      return { workout };
    },
  };
}
