export type GymFlowEnvironment = 'development' | 'test' | 'preview' | 'production';

const permittedTestAccountEnvironments: ReadonlySet<GymFlowEnvironment> = new Set(['development', 'test']);

export function getGymFlowEnvironment(value = process.env.EXPO_PUBLIC_GYMFLOW_ENV): GymFlowEnvironment | null {
  return value === 'development' || value === 'test' || value === 'preview' || value === 'production' ? value : null;
}

export function allowsDevelopmentTestAccounts(value = process.env.EXPO_PUBLIC_GYMFLOW_ENV): boolean {
  const environment = getGymFlowEnvironment(value);
  return environment !== null && permittedTestAccountEnvironments.has(environment);
}
