export interface MigrationLedgerAdapter {
  readVersion(): Promise<number | null>;
  writeVersion(version: number): Promise<void>;
  isCurrentCompatibilityBaseline(): Promise<boolean>;
}

export interface Migration {
  version: number;
  name: string;
  up(): Promise<void>;
}

export const LATEST_SCHEMA_VERSION = 12;
const COMPATIBILITY_BASELINE_VERSION = 6;

export async function runMigrationLedger(adapter: MigrationLedgerAdapter, migrations: Migration[]): Promise<number[]> {
  const ordered = [...migrations].sort((left, right) => left.version - right.version);
  const storedVersion = await adapter.readVersion();

  if (storedVersion === 1 && await adapter.isCurrentCompatibilityBaseline()) {
    await adapter.writeVersion(COMPATIBILITY_BASELINE_VERSION);
    const pending = ordered.filter(migration => migration.version > COMPATIBILITY_BASELINE_VERSION);
    const applied: number[] = [];
    for (const migration of pending) {
      await migration.up();
      await adapter.writeVersion(migration.version);
      applied.push(migration.version);
    }
    return applied;
  }

  const currentVersion = storedVersion ?? 0;
  const applied: number[] = [];
  for (const migration of ordered) {
    if (migration.version <= currentVersion) continue;
    await migration.up();
    await adapter.writeVersion(migration.version);
    applied.push(migration.version);
  }
  return applied;
}

export interface MigrationDatabase {
  getFirstAsync<T>(query: string, params?: unknown[]): Promise<T | null>;
  getAllAsync<T>(query: string, params?: unknown[]): Promise<T[]>;
  execAsync(query: string): Promise<void>;
  runAsync(query: string, params?: unknown[]): Promise<unknown>;
}

async function columnNames(database: MigrationDatabase, table: string): Promise<Set<string>> {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(columns.map(column => column.name));
}

async function ensureColumn(database: MigrationDatabase, table: string, name: string, definition: string): Promise<void> {
  if (!(await columnNames(database, table)).has(name)) {
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

async function hasTable(database: MigrationDatabase, name: string): Promise<boolean> {
  return Boolean(await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [name],
  ));
}

async function isCurrentM11Schema(database: MigrationDatabase): Promise<boolean> {
  if (!await hasTable(database, 'user_gyms')) return false;

  const [sessions, inventory, users] = await Promise.all([
    columnNames(database, 'sessions'),
    columnNames(database, 'gym_equipment'),
    columnNames(database, 'users'),
  ]);
  return ['paused_at', 'completed_at'].every(column => sessions.has(column))
    && inventory.has('capabilities_json')
    && ['display_name', 'avatar_uri', 'experience_level', 'training_goals_json', 'preferences_json', 'privacy_json', 'status', 'updated_at']
      .every(column => users.has(column));
}

function sqliteMigrations(database: MigrationDatabase): Migration[] {
  return [
    { version: 1, name: 'compatibility-baseline', up: async () => undefined },
    {
      version: 2,
      name: 'workout-lifecycle-columns',
      up: async () => {
        await ensureColumn(database, 'sessions', 'paused_at', 'INTEGER');
        await ensureColumn(database, 'sessions', 'completed_at', 'INTEGER');
      },
    },
    {
      version: 3,
      name: 'gym-equipment-capabilities',
      up: () => ensureColumn(database, 'gym_equipment', 'capabilities_json', 'TEXT'),
    },
    {
      version: 4,
      name: 'canonical-user-profile-columns',
      up: async () => {
        const columns: Array<[string, string]> = [
          ['display_name', "TEXT NOT NULL DEFAULT ''"],
          ['avatar_uri', 'TEXT'],
          ['experience_level', "TEXT NOT NULL DEFAULT 'unknown'"],
          ['training_goals_json', "TEXT NOT NULL DEFAULT '[]'"],
          ['preferences_json', `TEXT NOT NULL DEFAULT '{"preferredUnits":"metric","preferredTrainingIntent":"unknown","defaultRestSeconds":null,"preferMachines":null,"preferFreeWeights":null}'`],
          ['privacy_json', `TEXT NOT NULL DEFAULT '{"profileVisibility":"private","workoutVisibilityDefault":"private","programVisibilityDefault":"private"}'`],
          ['status', "TEXT NOT NULL DEFAULT 'active'"],
          ['updated_at', 'INTEGER NOT NULL DEFAULT 0'],
        ];
        for (const [name, definition] of columns) await ensureColumn(database, 'users', name, definition);
        const migratedColumns = await columnNames(database, 'users');
        if (migratedColumns.has('name')) await database.runAsync("UPDATE users SET display_name = name WHERE display_name = '' OR display_name IS NULL");
        if (migratedColumns.has('avatar')) await database.runAsync('UPDATE users SET avatar_uri = avatar WHERE avatar_uri IS NULL');
      },
    },
    {
      version: 5,
      name: 'gym-geography-columns',
      up: async () => {
        await ensureColumn(database, 'gyms', 'latitude', 'REAL');
        await ensureColumn(database, 'gyms', 'longitude', 'REAL');
        await ensureColumn(database, 'gyms', 'external_place_id', 'TEXT');
      },
    },
    { version: 6, name: 'gym-external-links', up: () => database.execAsync(`CREATE TABLE IF NOT EXISTS gym_external_links (id TEXT PRIMARY KEY, gym_id TEXT NOT NULL, provider TEXT NOT NULL, external_place_id TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(provider, external_place_id), FOREIGN KEY(gym_id) REFERENCES gyms(id) ON DELETE RESTRICT); CREATE INDEX IF NOT EXISTS idx_gym_external_links_gym ON gym_external_links(gym_id);`) },
    {
      version: 7,
      name: 'current-gym-context-and-workout-gym',
      up: async () => {
        await ensureColumn(database, 'sessions', 'gym_id', 'TEXT');
        await database.execAsync(`CREATE TABLE IF NOT EXISTS user_gym_contexts (user_id TEXT PRIMARY KEY, current_gym_id TEXT, selected_at INTEGER, updated_at INTEGER NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(current_gym_id) REFERENCES gyms(id) ON DELETE SET NULL);`);
      },
    },
    {
      version: 8,
      name: 'workout-exercise-replacement-provenance',
      up: async () => {
        await ensureColumn(database, 'session_exercises', 'replaced_from_exercise_id', 'TEXT');
        await ensureColumn(database, 'session_exercises', 'replacement_reason', 'TEXT');
        await ensureColumn(database, 'session_exercises', 'replacement_occurred_at', 'INTEGER');
      },
    },
    {
      version: 9,
      name: 'social-ownership-columns',
      up: async () => {
        await ensureColumn(database, 'sessions', 'owner_user_id', 'TEXT');
        await ensureColumn(database, 'templates', 'owner_user_id', 'TEXT');
        await database.runAsync("UPDATE sessions SET owner_user_id = 'local_default_user' WHERE owner_user_id IS NULL");
        await database.runAsync("UPDATE templates SET owner_user_id = 'local_default_user' WHERE owner_user_id IS NULL");
      },
    },
    {
      version: 10,
      name: 'social-core',
      up: () => database.execAsync(`
        CREATE TABLE IF NOT EXISTS social_posts (
          id TEXT PRIMARY KEY,
          author_user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          workout_session_id TEXT,
          program_id TEXT,
          gym_id TEXT,
          visibility TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY(author_user_id) REFERENCES users(id) ON DELETE RESTRICT
        );
        CREATE TABLE IF NOT EXISTS social_follows (
          follower_user_id TEXT NOT NULL,
          followed_user_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY(follower_user_id, followed_user_id),
          FOREIGN KEY(follower_user_id) REFERENCES users(id) ON DELETE RESTRICT,
          FOREIGN KEY(followed_user_id) REFERENCES users(id) ON DELETE RESTRICT
        );
        CREATE TABLE IF NOT EXISTS social_likes (
          user_id TEXT NOT NULL,
          post_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY(user_id, post_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
          FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE RESTRICT
        );
        CREATE TABLE IF NOT EXISTS social_comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author_user_id TEXT NOT NULL,
          content TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE RESTRICT,
          FOREIGN KEY(author_user_id) REFERENCES users(id) ON DELETE RESTRICT
        );
        CREATE TABLE IF NOT EXISTS social_saved_posts (
          user_id TEXT NOT NULL,
          post_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY(user_id, post_id),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
          FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE RESTRICT
        );
        CREATE INDEX IF NOT EXISTS idx_social_posts_feed ON social_posts(created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_social_posts_author ON social_posts(author_user_id, created_at DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_social_comments_post ON social_comments(post_id, created_at ASC, id ASC);
      `),
    },
    {
      version: 11,
      name: 'domain-user-auth-mapping',
      up: async () => {
        await ensureColumn(database, 'users', 'auth_provider', 'TEXT');
        await ensureColumn(database, 'users', 'auth_subject', 'TEXT');
        await database.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_identity ON users(auth_provider, auth_subject) WHERE auth_provider IS NOT NULL AND auth_subject IS NOT NULL;');
      },
    },
    { version: 12, name: 'gym-import-provenance', up: async () => {
      await ensureColumn(database, 'gyms', 'operator_gym_key', 'TEXT');
      await ensureColumn(database, 'gyms', 'source_name', 'TEXT');
      await ensureColumn(database, 'gyms', 'source_ref', 'TEXT');
      await database.execAsync('CREATE UNIQUE INDEX IF NOT EXISTS idx_gyms_operator_key ON gyms(operator_gym_key) WHERE operator_gym_key IS NOT NULL;');
    } },
  ];
}

export async function applySqliteMigrationLedger(database: MigrationDatabase): Promise<number[]> {
  return runMigrationLedger({
    async readVersion() {
      const row = await database.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'schema_version'");
      return row ? Number(row.value) : null;
    },
    writeVersion: version => database.runAsync(
      "INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [String(version)],
    ).then(() => undefined),
    isCurrentCompatibilityBaseline: () => isCurrentM11Schema(database),
  }, sqliteMigrations(database));
}
