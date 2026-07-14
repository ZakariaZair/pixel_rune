import { NativeModules, Platform } from 'react-native';

import type { ActiveRunePayload } from './types';

const WIDGET_BRIDGE_MODULE_NAME = 'PixelRuneWidgetBridge';

type WidgetSyncResult = {
  appGroupIdentifier: string;
  key: string;
  widgetKind: string;
};

type PixelRuneWidgetBridgeModule = {
  writeActiveRunePayload(payloadJson: string): Promise<WidgetSyncResult>;
};

type WidgetSyncUnavailableResult = {
  status: 'unavailable';
  reason: string;
};

type WidgetSyncSuccessResult = {
  status: 'synced';
  result: WidgetSyncResult;
};

export type WidgetSyncState = WidgetSyncSuccessResult | WidgetSyncUnavailableResult;

function getWidgetBridge(): PixelRuneWidgetBridgeModule | null {
  const bridge = NativeModules[WIDGET_BRIDGE_MODULE_NAME] as PixelRuneWidgetBridgeModule | undefined;

  if (!bridge?.writeActiveRunePayload) {
    return null;
  }

  return bridge;
}

export async function syncActiveRunePayloadToWidget(
  payload: ActiveRunePayload,
): Promise<WidgetSyncState> {
  if (Platform.OS !== 'ios') {
    return {
      status: 'unavailable',
      reason: 'iOS WidgetKit is unavailable on this platform.',
    };
  }

  const bridge = getWidgetBridge();

  if (!bridge) {
    return {
      status: 'unavailable',
      reason: 'Native widget bridge is unavailable. Use an iOS development/prebuild app, not Expo Go.',
    };
  }

  const result = await bridge.writeActiveRunePayload(JSON.stringify(payload));

  return {
    status: 'synced',
    result,
  };
}
