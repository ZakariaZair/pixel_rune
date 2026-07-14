# Pixel Rune - Architecture

## High-level architecture

Pixel Rune has two major runtime surfaces:

```txt
Expo React Native app
  - Rune selection
  - Rune customization
  - in-app preview
  - sharing flows
  - account/backend integration

iOS WidgetKit extension
  - native SwiftUI widget
  - reads the active Rune
  - displays the Rune on the iOS home screen
```

The widget is not a React Native screen. It must be implemented with native iOS WidgetKit/SwiftUI.

## Current stack

- Expo SDK 57
- React Native
- TypeScript
- Supabase
- RevenueCat
- Sentry
- PostHog
- EAS Build/Submit

## Current code structure

```txt
App.tsx
src/
  config/
    env.ts
  diagnostics/
    startupDiagnostics.ts
  lib/
    logger.ts
    supabase.ts
```

## Target code structure

```txt
src/
  components/
  config/
  diagnostics/
  features/
    runes/
    sharing/
    auth/
  lib/
  navigation/
  screens/
  theme/
```

## Rune data model

Initial TypeScript model:

```ts
export type RunePixel = {
  x: number;
  y: number;
  color: string;
};

export type Rune = {
  id: string;
  name: string;
  width: number;
  height: number;
  pixels: RunePixel[];
  backgroundColor?: string;
  createdBy?: string;
};
```

Constraints:

- Keep grids small enough for widget rendering.
- Prefer serializable JSON.
- Avoid app-only objects that Swift cannot easily decode.
- Keep the model stable before building sharing.

## Local app storage

The app needs local persistence for:

- active Rune ID;
- active Rune payload;
- user preferences;
- last known widget payload.

For the widget, iOS data sharing should use App Groups. The app writes a JSON payload into shared storage; the WidgetKit extension reads it.

## iOS widget architecture

Native widget integration is configured through the local Expo config plugin
`plugins/withPixelRuneWidget.js`. The repository intentionally does not commit
generated `ios/` output yet. During `npx expo prebuild --platform ios` or EAS
Build, the plugin creates a WidgetKit extension target named `PixelRuneWidget`
and generates these native files:

```txt
ios/
  PixelRuneWidget/
    PixelRuneWidget.swift
    PixelRuneWidget-Info.plist
    PixelRuneWidget.entitlements
```

The Swift file contains the timeline provider, Rune decoder, fallback payload,
and SwiftUI renderer. The widget currently targets the small widget family only.

Native identifiers:

- App bundle identifier: `com.pixelrune.app`
- Widget bundle identifier: `com.pixelrune.app.widget`
- App Group identifier: `group.com.pixelrune.app`

Widget responsibilities:

- decode active Rune JSON;
- render pixel grid in SwiftUI;
- provide placeholder and fallback states;
- refresh when the app requests a timeline reload, within iOS limits.

## Expo/native integration options

Possible approaches:

1. Expo prebuild with committed `ios/` folder.
2. Expo config plugin that creates/configures the widget extension.
3. Start with manual native iOS implementation, then formalize later.

Decision: use Expo Continuous Native Generation with a local config plugin for
the WidgetKit proof of concept. This keeps the native integration reproducible
without committing generated native folders before the widget target has been
validated in Xcode.

The first proof of concept renders the active Rune payload from App Group
`UserDefaults` key `activeRunePayload`. The React Native app still needs a small
native bridge or compatible Expo module to write that key and request a widget
timeline reload from JavaScript. Until that bridge exists, the widget shows its
safe fallback Rune.

## Motion architecture

In-app motion:

- can be implemented using native motion APIs exposed through Expo/native module or React Native library;
- should only run while app is foregrounded;
- can update Rune preview in real time.

Widget motion:

- should not rely on continuous sensor updates;
- should display static, scheduled, or last-captured visual states;
- must be validated against WidgetKit behavior before product claims.

## Backend architecture

Supabase should be used for:

- user accounts, if sharing requires identity;
- sent Rune records;
- received Rune inbox;
- optional profiles;
- row-level security.

Backend should not be introduced before the local Rune/widget loop is stable unless sharing becomes the immediate priority.

## Observability

- Sentry: crashes/errors.
- PostHog: analytics events.
- Existing startup diagnostics: development verification.

Suggested early events:

- `rune_selected`
- `rune_customized`
- `widget_setup_started`
- `widget_rune_updated`
- `rune_sent`
- `rune_received`

## Validation commands

```bash
npm run typecheck
npx expo-doctor
```

Native/widget validation will require iOS build tooling and possibly EAS/dev builds.

## Technical risks

- WidgetKit cannot provide real-time motion-reactive behavior.
- Widget refresh is controlled by iOS and may not be instant.
- Expo + WidgetKit requires native configuration beyond normal Expo Go.
- RevenueCat and other native modules may require development builds.
- Android widget support is a separate implementation path.
