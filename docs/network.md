# Pixel Rune - Network and Communication Plan

## Purpose

This document defines how app surfaces and backend services communicate.

It covers:

- app to local storage;
- app to iOS widget;
- app to Supabase;
- user-to-user Rune sharing;
- analytics/monitoring;
- refresh expectations.

## System surfaces

```txt
React Native app
  -> local app storage
  -> App Group shared storage
  -> Supabase
  -> PostHog
  -> Sentry
  -> RevenueCat

iOS WidgetKit extension
  -> App Group shared storage
  -> WidgetKit timeline
```

The widget should not directly depend on Supabase for the MVP. It should read local shared state written by the app.

## Local app to widget communication

Flow:

```txt
User selects Rune in app
App serializes active Rune payload
App writes payload to App Group shared storage
App requests WidgetKit timeline reload
Widget reads shared payload
Widget renders Rune
```

Important limitation:

- The app can request a widget reload, but iOS controls timing and budget.
- The widget must render a safe fallback if the shared payload is missing or invalid.

Current native proof-of-concept details:

- App Group identifier: `group.com.pixelrune.app`.
- Shared storage mechanism: App Group `UserDefaults`.
- Shared key: `activeRunePayload`.
- Payload encoding: UTF-8 JSON string matching the active Rune payload below.
- Widget behavior: read on snapshot/timeline generation; render fallback if
  missing or invalid.
- App writer bridge: generated native module `PixelRuneWidgetBridge`.
- JavaScript wrapper: `src/features/runes/widgetSync.ts`.
- Reload request: `WidgetCenter.reloadTimelines(ofKind: "PixelRuneWidget")`.

The bridge is available only in an iOS development/prebuild build. Expo Go,
Android, and web safely report the bridge as unavailable instead of failing.

## Active Rune payload

Initial JSON shape:

```json
{
  "version": 1,
  "selectedAt": "2026-07-14T00:00:00.000Z",
  "rune": {
    "id": "heart-default",
    "name": "Heart",
    "width": 8,
    "height": 8,
    "backgroundColor": "#101018",
    "pixels": [
      { "x": 3, "y": 2, "color": "#FF4D8D" }
    ]
  }
}
```

## Supabase communication

Supabase should start as the backend for sharing, not for the local widget MVP.

Potential tables:

### `profiles`

```txt
id uuid primary key
display_name text
avatar_url text nullable
created_at timestamptz
```

### `runes`

```txt
id uuid primary key
owner_id uuid references profiles(id)
name text
width int
height int
background_color text nullable
pixels jsonb
visibility text -- private/shared/public
created_at timestamptz
updated_at timestamptz
```

### `rune_messages`

```txt
id uuid primary key
sender_id uuid references profiles(id)
recipient_id uuid references profiles(id)
rune_id uuid references runes(id)
message text nullable
status text -- sent/received/accepted/dismissed
created_at timestamptz
accepted_at timestamptz nullable
```

## Sharing flow

Initial account-based flow:

```txt
Sender chooses Rune
Sender selects recipient
App creates rune_messages row
Recipient app fetches inbox
Recipient accepts Rune
Rune becomes available locally
Recipient can set Rune as active widget Rune
App writes active Rune payload to App Group storage
Widget updates when iOS allows refresh
```

Alternative invite-link flow:

```txt
Sender creates share link
Recipient opens link
App imports Rune
Recipient can save or activate Rune
```

Decision pending: choose account-based sharing or invite-link sharing for MVP.

## Authentication

Authentication is only required once sharing needs identity.

Potential providers:

- email magic link;
- Sign in with Apple;
- Google sign-in for Android later.

For App Store seriousness, Sign in with Apple should be considered if third-party login is added.

## Notifications

Notifications are useful but not required for the first local widget MVP.

Possible later flow:

```txt
Rune message created
Supabase Edge Function or backend trigger sends push notification
Recipient opens app
App fetches Rune message
Recipient accepts/activates Rune
Widget refresh requested
```

## Analytics communication

PostHog events should avoid storing sensitive pixel payloads unless explicitly needed.

Suggested events:

- `rune_selected`
- `rune_preview_opened`
- `widget_update_requested`
- `rune_sent`
- `rune_received`
- `rune_accepted`

## Error monitoring

Sentry should capture:

- app startup errors;
- Supabase request failures;
- Rune decode/render errors in app;
- native/widget integration errors where possible.

## Security and privacy

Rules:

- Do not expose `.env` secrets.
- Treat user-created Runes as user data.
- Use Supabase Row Level Security before real users.
- Keep widget payload local unless the user shares it.
- Avoid collecting unnecessary motion data.
- If motion is used, process it locally and do not upload raw sensor streams.

## Refresh expectations

The product must not promise:

- instant remote-to-widget updates;
- continuous background syncing;
- real-time widget animation;
- sensor-reactive widgets.

The product can promise:

- selecting a Rune in the app updates the widget;
- received Runes can be activated in the widget;
- in-app previews can be interactive and motion-reactive.
