# GymFlow

GymFlow is an Expo and React Native workout-tracking application. The project
contains modules for workout templates, quick workouts, exercise and equipment
data, gym context, workout history, and locally persisted workout sessions.
Its mobile persistence layer uses Expo SQLite; the web implementation uses
in-memory seed data.

## Requirements

- Node.js and npm
- Expo-compatible Android, iOS, or web development environment

## Run locally

```bash
npm install
npm run start
```

To launch a platform-specific development session:

```bash
npm run android
npm run ios
npm run web
```

## Test

```bash
npm test
```

## Project notes

The application uses Expo Router, React Navigation, Expo SQLite, Secure Store,
and TypeScript. Its public module boundaries are documented in
[`docs/HANDOFF.md`](docs/HANDOFF.md).
