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
  -> operating system share sheet
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

Initial no-database flow:

```txt
Sender chooses Rune
App serializes Rune into a versioned share payload
App encodes payload as a pixelrune://share?payload=... URL
Sender chooses a delivery channel in the OS share sheet
Recipient opens the share URL in Pixel Rune
App decodes and validates the payload
App adds the received Rune to local custom Runes
Recipient can set the received Rune as the active widget Rune
App writes active Rune payload to App Group storage
Widget updates when iOS allows refresh
```

Current implementation:

- Codec: `src/features/sharing/runeShareCodec.ts`.
- Share sheet helper: `src/features/sharing/runeShareService.ts`.
- Import helper: `importSharedRune`, which validates the payload and persists it
  as a local custom Rune.
- No Contacts permission is required for this flow.
- No Pixel Rune backend or database is required for this flow.

Payload URL shape:

```txt
pixelrune://share?payload=<base64url-json>
```

The decoded JSON is versioned:

```json
{
  "version": 1,
  "kind": "pixel-rune-share",
  "sharedAt": "2026-07-15T00:00:00.000Z",
  "rune": {
    "id": "heart-default",
    "name": "Heart",
    "width": 16,
    "height": 16,
    "backgroundColor": "#101018",
    "pixels": [
      { "x": 3, "y": 2, "color": "#FF4D8D" }
    ]
  },
  "note": "optional short note"
}
```

The recipient app should require explicit user action before making an imported
Rune active. Imported Runes can be saved locally first, then activated like any
other custom Rune.

Future account-based flow, if inbox-style sharing becomes necessary:

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

Decision: use encoded share-sheet/deep-link sharing for the first sharing
version. Supabase remains a later option for inboxes, cross-device sync,
notifications, abuse controls, or relationship/social features.

## Authentication

Authentication is only required once sharing needs server-side identity.

The no-database share-sheet flow does not require accounts because the sender
delivers the payload through a channel chosen by the user outside Pixel Rune.

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
- Do not request Contacts permission for basic sharing; the OS share sheet is
  sufficient and avoids collecting address book data.
- Validate imported Rune payloads before persistence.
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
- received Runes can be imported, accepted, and activated in the widget;
- in-app previews can be interactive and motion-reactive.
