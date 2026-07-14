# Agent Instructions - Pixel Rune

## Expo version rule

Expo has changed. Before changing Expo-specific APIs, native modules, EAS config, or app config, read the exact versioned docs for SDK 57:

https://docs.expo.dev/versions/v57.0.0/

## Project goal

Build a production-ready mobile app for iOS and Android around customizable pixel-art Runes, with an iOS WidgetKit widget that displays the selected Rune.

## Current stack

- Expo SDK 57
- React Native
- TypeScript
- Supabase
- RevenueCat
- Sentry
- PostHog
- EAS Build/Submit

## Working rules

- Check `git status --short` before editing.
- Preserve user changes and unrelated work.
- Start by reading `docs/requirements.md`, `docs/architecture.md`, and `docs/network.md` when they are relevant to the task.
- Use TypeScript and keep `strict` mode passing.
- Prefer simple, maintainable code over clever abstractions.
- Do not add heavy dependencies without a concrete reason.
- Do not edit real `.env` secrets unless explicitly asked.
- Keep logs useful, scoped, and not noisy.
- Run `npm run typecheck` after code changes.
- Run `npx expo-doctor` after dependency, Expo, native-module, or app config changes.
- If a task needs network/package install and the sandbox blocks it, request approval instead of working around it.

## Architecture preferences

- App bootstrap: `App.tsx`
- Config: `src/config`
- Diagnostics: `src/diagnostics`
- Integrations/services: `src/lib`
- Reusable UI: `src/components`
- Screens: `src/screens`
- Feature logic: `src/features/<feature-name>`
- Navigation: `src/navigation`

Avoid putting feature business logic directly in `App.tsx`.

## Agent categories

This project uses three agent categories. Pick one category per discussion.

### Project Management Agents

Purpose: clarify product, scope, release planning, and technical sequencing.

Allowed changes:

- `docs/requirements.md`
- `docs/architecture.md`
- `docs/network.md`
- `docs/decisions.md`
- `tasks/backlog.md`
- `tasks/current.md`

Rules:

- Do not implement code.
- Convert vague ideas into requirements, acceptance criteria, and tasks.
- Explicitly call out risks and unknowns.

### Implementation Agents

Purpose: implement one narrow feature or technical slice.

Allowed changes:

- Code/config files required by the assigned task.
- Documentation only when needed to reflect the implementation.

Rules:

- Stay inside the requested scope.
- Do not make broad product decisions.
- Run `npm run typecheck` after TypeScript changes.
- Run `npx expo-doctor` after dependency, Expo, native-module, or app config changes.
- For iOS WidgetKit work, document whether a development build/prebuild is required.

### Validation Agents

Purpose: review code, architecture, requirements, App Store readiness, privacy, and security.

Allowed changes:

- Prefer reports and task updates.
- Only make code changes if explicitly asked.

Rules:

- Compare implementation against `docs/requirements.md`.
- Identify gaps, risks, regressions, and missing tests.
- Do not expand scope while validating.

## Product constraints

- The Expo app can animate Runes using device motion while the app is open.
- The iOS home screen widget must be implemented natively with WidgetKit/SwiftUI.
- WidgetKit widgets are not real-time mini-apps. Do not assume continuous motion sensors, arbitrary background execution, or guaranteed instant refresh in the widget.
- The MVP should present widget motion conservatively: live motion in the app, static or scheduled/limited visual states in the widget.

## Definition of done

A task is done when:

- The requested behavior is implemented.
- Relevant validation passes or failures are documented.
- Any setup/testing instructions are clear.
- Requirements, architecture, network, decisions, or backlog docs are updated if the change affects them.
