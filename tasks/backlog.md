# Pixel Rune - Backlog

## Phase 0 - Product and feasibility

- [x] Document WidgetKit feasibility limits.
- [x] Define documentation model.
- [x] Decide first widget sizes to support.
- [ ] Decide whether sharing MVP uses accounts or invite links.
- [ ] Decide if custom editor is MVP or post-MVP.

## Phase 1 - Local Rune MVP

- [x] Create `src/features/runes` data model.
- [x] Add default Rune presets.
- [x] Expand default Rune presets with widget-friendly 16×16 options.
- [x] Add Rune preview component.
- [x] Add active Rune selection state.
- [x] Persist active Rune locally.
- [x] Define active Rune widget payload serializer.
- [x] Move diagnostics into a dedicated developer/settings screen.

## Phase 2 - iOS Widget MVP

- [x] Choose Expo native integration approach: local config plugin with CNG/prebuild.
- [x] Create small iOS WidgetKit proof of concept.
- [x] Configure App Group in generated app/widget entitlements.
- [x] Write active Rune payload from app to shared storage.
- [x] Render active Rune in SwiftUI widget.
- [x] Add widget placeholder/fallback state for missing or invalid payloads.
- [x] Document widget testing workflow.

## Phase 3 - Sharing

- [ ] Define sharing mode: account-based or invite-link.
- [ ] Create Supabase schema.
- [ ] Add RLS policies.
- [ ] Add send Rune flow.
- [ ] Add receive/accept Rune flow.
- [ ] Add optional notifications plan.

## Phase 4 - Store readiness

- [ ] Finalize bundle/package identifiers.
- [ ] Create production icon and splash.
- [ ] Draft privacy policy.
- [ ] Configure Sentry project metadata.
- [ ] Configure PostHog project.
- [ ] Decide RevenueCat launch scope.
- [ ] Prepare TestFlight build.
- [ ] Prepare Google Play internal/closed test.
