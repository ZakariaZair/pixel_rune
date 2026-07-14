# Pixel Rune

App mobile Expo + React Native + TypeScript prête pour iOS et Android.

## Agent workflow

Ce repo est configuré pour travailler avec des discussions Zed/Codex spécialisées.

- Instructions principales: `AGENTS.md`
- Exigences produit: `docs/requirements.md`
- Architecture technique: `docs/architecture.md`
- Plan communication/network: `docs/network.md`
- Décisions durables: `docs/decisions.md`
- Tâche active: `tasks/current.md`
- Backlog: `tasks/backlog.md`
- Prompts initiaux par agent: `AGENT_DISCUSSION_INSTRUCTIONS.txt`

Avant de lancer une nouvelle discussion agent, choisis un rôle dans `AGENT_DISCUSSION_INSTRUCTIONS.txt`, colle le prompt correspondant, puis donne une tâche précise.

## Lancer en local

```bash
npm run start
```

Puis ouvre l’app avec Expo Go ou lance un simulateur via:

```bash
npm run ios
npm run android
```

Pour repartir avec un cache propre:

```bash
npm run start:clear
```

## Configuration

Copie `.env.example` vers `.env` et remplis les clés nécessaires:

- Supabase: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Sentry: `EXPO_PUBLIC_SENTRY_DSN`
- PostHog: `EXPO_PUBLIC_POSTHOG_API_KEY`
- RevenueCat: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`

Sans ces clés, l’app démarre quand même et affiche les services manquants dans l’écran et le Terminal.

## Builds stores

```bash
npm run eas:build:android
npm run eas:build:ios
```

Soumettre aux stores après un build:

```bash
npm run eas:submit:android
npm run eas:submit:ios
```

Les identifiants par défaut sont:

- iOS: `com.pixelrune.app`
- Android: `com.pixelrune.app`

Change-les avant publication si tu veux un autre bundle/package id.
