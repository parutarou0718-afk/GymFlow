import { readFile } from 'node:fs/promises';
import { createWebStore } from '../src/db/web-store';
import { createGymDataImportService, parseGymImportCsv, type GymImportData } from '../src/modules/gym-data-import';

async function main() {
  const [command, path] = process.argv.slice(2);
  if ((command !== 'validate' && command !== 'import') || !path) throw new Error('Usage: gym-data-cli <validate|import> <file.json>');
  const source = await readFile(path, 'utf8');
  const data = path.endsWith('.csv') ? parseGymImportCsv(source) : JSON.parse(source) as GymImportData;
  const service = createGymDataImportService(createWebStore());
  const plan = await service.plan(data);
  console.log(JSON.stringify(plan.summary, null, 2));
  if (command === 'import') { await service.apply(plan); console.log('Gym import complete'); }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
