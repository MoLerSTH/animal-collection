import type * as ApplicationModule from 'expo-application';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import appConfig from '../../../app.json';

export interface AppVersionInfo {
  readonly version: string;
  readonly buildNumber: string | null;
  readonly source: 'native' | 'config';
}

let cachedApplicationModule: typeof ApplicationModule | null | undefined;

/**
 * Loads `expo-application` lazily and only when the `ExpoApplication` native
 * module is actually linked, avoiding Metro `guardedLoadModule` fatal errors
 * on older dev-client/native binaries.
 */
function getApplicationModule(): typeof ApplicationModule | null {
  if (cachedApplicationModule !== undefined) {
    return cachedApplicationModule;
  }
  try {
    if (!requireOptionalNativeModule('ExpoApplication')) {
      cachedApplicationModule = null;
      return null;
    }
    cachedApplicationModule = require('expo-application') as typeof ApplicationModule;
  } catch {
    cachedApplicationModule = null;
  }
  return cachedApplicationModule;
}

function resolveConfigBuildNumber(): string | null {
  if (Platform.OS === 'ios') {
    const iosBuild = appConfig.expo?.ios?.buildNumber;
    return iosBuild != null && String(iosBuild).trim().length > 0 ? String(iosBuild).trim() : null;
  }
  if (Platform.OS === 'android') {
    const androidCode = appConfig.expo?.android?.versionCode;
    return androidCode != null && String(androidCode).trim().length > 0 ? String(androidCode).trim() : null;
  }
  return null;
}

export function getAppVersionInfo(): AppVersionInfo {
  const application = getApplicationModule();
  const nativeVersion = application?.nativeApplicationVersion?.trim();
  const nativeBuild = application?.nativeBuildVersion?.trim();

  if (nativeVersion) {
    return {
      version: nativeVersion,
      buildNumber: nativeBuild || null,
      source: 'native',
    };
  }

  const configVersion = appConfig.expo?.version?.trim() || '1.0.0';
  const configBuild = resolveConfigBuildNumber();

  return {
    version: configVersion,
    buildNumber: configBuild,
    source: 'config',
  };
}

export function formatAppVersion(info?: AppVersionInfo): string {
  const resolved = info ?? getAppVersionInfo();
  const trimmedBuild = resolved.buildNumber?.trim();
  if (trimmedBuild && trimmedBuild.length > 0) {
    return `${resolved.version} (${trimmedBuild})`;
  }
  return resolved.version;
}

export function getClientMetadataHeaders(): Record<string, string> {
  return {
    'X-App-Version': formatAppVersion(),
    'X-Platform': Platform.OS,
  };
}
