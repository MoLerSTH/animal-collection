import * as Application from 'expo-application';
import { Platform } from 'react-native';
import appConfig from '../../../app.json';

export interface AppVersionInfo {
  readonly version: string;
  readonly buildNumber: string | null;
  readonly source: 'native' | 'config';
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
  const nativeVersion = Application.nativeApplicationVersion?.trim();
  const nativeBuild = Application.nativeBuildVersion?.trim();

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
