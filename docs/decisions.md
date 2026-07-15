# Pixel Rune - Decisions

Use this document for durable decisions that future agents should respect.

## 2026-07-14 - Expo + native widget architecture

Decision: use Expo React Native for the main app and native WidgetKit/SwiftUI for the iOS widget.

Reasoning:

- Expo is efficient for app UI and iteration.
- iOS home screen widgets require native WidgetKit.
- Widget code should be isolated from the React Native app runtime.

## 2026-07-14 - Widget motion positioning

Decision: do not make real-time motion-reactive widget behavior a first-MVP promise.

Reasoning:

- WidgetKit widgets are not continuously running mini-apps.
- Sensor-driven behavior is appropriate in the foreground app.
- The widget should display static, scheduled, or last-captured visual states.

## 2026-07-14 - Documentation model

Decision: use requirements, architecture, and network docs as the main project source of truth.

Reasoning:

- The project is simple enough to avoid heavyweight multi-agent coordination logs.
- Specialized agents should work from stable documents.
- Implementation and validation agents need clear acceptance criteria.

## 2026-07-14 - Local widget loop before sharing

Decision: prove the local Rune selection, persistence, and iOS widget display loop before building sharing, accounts, Supabase-backed Rune messages, or monetization.

Reasoning:

- The widget is the first technical differentiator and has native integration risk.
- Sharing depends on a stable Rune payload and activation flow.
- Backend identity decisions should not block validating whether selected Runes display correctly in the app and widget.

## 2026-07-14 - First widget size

Decision: target the small iOS widget size first for the WidgetKit proof of concept.

Reasoning:

- A small widget matches the "small visual ritual" product promise.
- It forces the Rune grid and fallback UI to stay simple.
- Medium/large widget layouts can be added once the payload and rendering path are validated.

## 2026-07-15 - First sharing mode

Decision: use no-database Rune sharing first through encoded share payloads sent
with the operating system share sheet.

Reasoning:

- The native share sheet lets users choose Messages, AirDrop, WhatsApp, email,
  or another installed app without Pixel Rune collecting contact data.
- Contacts permission does not deliver data by itself; it only exposes address
  book identifiers and adds avoidable privacy review burden.
- A share payload can be imported locally as a custom Rune and activated by the
  recipient without accounts, Supabase, or RLS.
- Widget refresh expectations remain conservative: received Runes should be
  accepted/imported in the app, then activated locally before the app requests a
  WidgetKit timeline reload.
