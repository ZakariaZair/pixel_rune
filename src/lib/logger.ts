import Constants from 'expo-constants';
import * as Device from 'expo-device';

function stamp() {
  return new Date().toISOString();
}

export function logInfo(scope: string, message: string, details?: Record<string, unknown>) {
  console.log(`[${stamp()}] [${scope}] ${message}`, details ?? '');
}

export function logWarn(scope: string, message: string, details?: Record<string, unknown>) {
  console.warn(`[${stamp()}] [${scope}] ${message}`, details ?? '');
}

export function logError(scope: string, message: string, error?: unknown) {
  console.error(`[${stamp()}] [${scope}] ${message}`, error);
}

export function logAppBoot() {
  logInfo('App', 'Boot sequence started', {
    appName: Constants.expoConfig?.name,
    appVersion: Constants.expoConfig?.version,
    runtime: Constants.executionEnvironment,
    platform: Device.osName,
    osVersion: Device.osVersion,
    deviceName: Device.deviceName,
    isDevice: Device.isDevice,
  });
}
