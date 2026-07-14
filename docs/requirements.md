# Pixel Rune - Requirements

## Product vision

Pixel Rune is a mobile app that lets users select, customize, and share small pixel-art "Runes" that can be displayed in an iPhone home screen widget.

The app should feel simple, personal, and polished enough for an App Store launch from the beginning.

## Core user promise

Users can choose or create a small pixel-art Rune, set it as their active widget Rune, and send meaningful pixel messages such as a heart to someone close to them.

## Target users

- iPhone users who like aesthetic widgets and personalization.
- Couples/friends who want lightweight emotional pixel messages.
- Users who enjoy pixel art, charms, collectibles, or small visual rituals.

Android support remains part of the broader product strategy, but the first technical differentiator is the iOS widget.

## MVP scope

The first MVP should prove the local Rune-to-widget loop before adding backend sharing or monetization. Sharing and customization remain product priorities, but they should not block the first widget-capable build.

### Must have

- A default collection of built-in Runes.
- A Rune selection screen.
- A Rune preview in the app.
- A selected active Rune persisted locally.
- An iOS WidgetKit widget that displays the selected Rune.
- A basic Rune data model that can be shared between the app and widget.
- Basic diagnostics/logging remain available during development.

### Should have

- Simple color customization.
- Simple Rune editor or limited customization controls, after the default Rune loop is stable.
- A first sharing mechanism to send a Rune to another user, after the local widget loop is stable.
- Supabase-backed storage for sent/received Runes, only once the sharing mode is chosen.

### Could have

- Motion-reactive preview inside the app.
- Widget visual variants based on the last app state.
- Premium Rune packs.
- Notifications when a Rune is received.

### Out of scope for first MVP

- Real-time motion-reactive home screen widget.
- Complex multiplayer/social feed.
- Full marketplace.
- Advanced animation system.
- Android home screen widget, unless iOS MVP is stable first.

## Widget feasibility requirements

The product must respect iOS WidgetKit constraints:

- The widget can display a Rune using native SwiftUI/WidgetKit.
- The app can pass selected Rune data to the widget using an App Group.
- The widget should not depend on continuous background execution.
- The widget should not depend on real-time motion sensors.
- Widget refresh timing cannot be treated as instant or fully controlled by the app.

## Motion behavior requirements

Motion is split into two product surfaces:

- In-app: Runes may react to phone movement while the app is open.
- Widget: Runes should be static, scheduled, or show a stored visual state. Any motion-like behavior must be compatible with WidgetKit limitations.

## Sharing requirements

The first sharing version should support:

- sending a Rune to another user;
- receiving a Rune;
- storing sent/received Rune metadata;
- selecting a received Rune as active;
- updating the widget after the active Rune changes.

Open questions:

- Should sharing require accounts from day one?
- Should a Rune be sent by invite link, username, phone contact, or QR code?
- Should received Runes auto-activate or require acceptance?

## Monetization requirements

Potential monetization:

- premium Rune packs;
- premium customization options;
- subscription only if ongoing value is clear.

RevenueCat is installed but should not drive MVP scope until the core widget loop works.

## Store-readiness requirements

- Avoid claiming unsupported real-time widget behavior.
- Document privacy clearly.
- Minimize permissions.
- If motion is used, explain why and where.
- If sharing/accounts are used, define user data retention and deletion behavior.
- Keep the app useful without excessive onboarding.

## MVP acceptance criteria

The MVP is acceptable when:

- a user can open the app and select a default Rune;
- at least three built-in Runes are available;
- the selected Rune can be previewed in the app before and after selection;
- the selected Rune persists after app restart;
- the iOS widget displays the selected Rune from the same serializable payload shape used by the app;
- the widget has safe placeholder/fallback rendering for missing or invalid Rune data;
- the architecture supports later customization and sharing;
- the app passes TypeScript validation;
- the native/widget build path is documented;
- App Store claims match actual technical behavior.

## First local implementation slice acceptance criteria

Before native widget work starts, the app should meet these criteria:

- Rune types live in `src/features/runes`.
- At least three default Runes are defined as serializable JSON-compatible data.
- A reusable Rune preview renders those default Runes from the shared model.
- A user can select an active Rune in the app session.
- Active Rune persistence is either implemented or explicitly queued as the next task.
- No Supabase sharing, RevenueCat paywall, or native WidgetKit work is added in this slice.
