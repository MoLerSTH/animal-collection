import * as Application from 'expo-application';
import { Platform } from 'react-native';
import appConfig from '../../../../app.json';
import { formatAppVersion, getAppVersionInfo, getClientMetadataHeaders } from '../appVersion';

describe('appVersion', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, configurable: true });
    jest.restoreAllMocks();
  });

  it('uses native version and build number when expo-application provides both', () => {
    jest.replaceProperty(Application, 'nativeApplicationVersion', '1.2.0');
    jest.replaceProperty(Application, 'nativeBuildVersion', '14');
    expect(getAppVersionInfo()).toEqual({ version: '1.2.0', buildNumber: '14', source: 'native' });
    expect(formatAppVersion()).toBe('1.2.0 (14)');
  });

  it('falls back to app.json version and android versionCode when native values are null', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    jest.replaceProperty(Application, 'nativeApplicationVersion', null);
    jest.replaceProperty(Application, 'nativeBuildVersion', null);
    expect(getAppVersionInfo()).toEqual({
      version: appConfig.expo.version,
      buildNumber: String(appConfig.expo.android.versionCode),
      source: 'config',
    });
  });

  it('uses ios.buildNumber fallback when Platform.OS is ios', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    jest.replaceProperty(Application, 'nativeApplicationVersion', null);
    jest.replaceProperty(Application, 'nativeBuildVersion', null);
    expect(getAppVersionInfo()).toEqual({
      version: appConfig.expo.version,
      buildNumber: appConfig.expo.ios.buildNumber,
      source: 'config',
    });
  });

  it('omits parentheses when buildNumber is empty or whitespace', () => {
    expect(formatAppVersion({ version: '2.0.0', buildNumber: '   ', source: 'native' })).toBe('2.0.0');
    expect(formatAppVersion({ version: '2.0.0', buildNumber: null, source: 'config' })).toBe('2.0.0');
  });

  it('builds X-App-Version and X-Platform headers from formatted version and Platform.OS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
    jest.replaceProperty(Application, 'nativeApplicationVersion', '1.0.1');
    jest.replaceProperty(Application, 'nativeBuildVersion', '9');
    expect(getClientMetadataHeaders()).toEqual({
      'X-App-Version': '1.0.1 (9)',
      'X-Platform': 'android',
    });
  });

  it('falls back gracefully to app.json when requireOptionalNativeModule returns null', () => {
    jest.resetModules();
    const expoModulesCore = require('expo-modules-core') as typeof import('expo-modules-core');
    jest.spyOn(expoModulesCore, 'requireOptionalNativeModule').mockReturnValueOnce(null);
    jest.doMock('expo-application', () => {
      throw new Error('Should not load expo-application when native module is absent');
    });
    const isolatedPlatform = (require('react-native') as typeof import('react-native')).Platform;
    const prevOs = isolatedPlatform.OS;
    Object.defineProperty(isolatedPlatform, 'OS', { value: 'android', configurable: true });
    try {
      const isolated = require('../appVersion') as typeof import('../appVersion');
      expect(isolated.getAppVersionInfo()).toEqual({
        version: appConfig.expo.version,
        buildNumber: String(appConfig.expo.android.versionCode),
        source: 'config',
      });
      expect(isolated.formatAppVersion()).toBe(`${appConfig.expo.version} (${appConfig.expo.android.versionCode})`);
      expect(isolated.getClientMetadataHeaders()).toEqual({
        'X-App-Version': `${appConfig.expo.version} (${appConfig.expo.android.versionCode})`,
        'X-Platform': 'android',
      });
    } finally {
      Object.defineProperty(isolatedPlatform, 'OS', { value: prevOs, configurable: true });
      jest.doMock('expo-application', () => ({
        __esModule: true,
        nativeApplicationVersion: '1.0.1',
        nativeBuildVersion: '3',
        applicationId: 'com.thegentlemenofjuthathep.animalcollection',
      }));
      jest.resetModules();
    }
  });

  it('falls back gracefully to app.json when native module ExpoApplication throws on load', () => {
    jest.resetModules();
    jest.doMock('expo-application', () => {
      throw new Error("Cannot find native module 'ExpoApplication'");
    });
    const isolatedPlatform = (require('react-native') as typeof import('react-native')).Platform;
    const prevOs = isolatedPlatform.OS;
    Object.defineProperty(isolatedPlatform, 'OS', { value: 'android', configurable: true });
    try {
      const isolated = require('../appVersion') as typeof import('../appVersion');
      expect(isolated.getAppVersionInfo()).toEqual({
        version: appConfig.expo.version,
        buildNumber: String(appConfig.expo.android.versionCode),
        source: 'config',
      });
      expect(isolated.formatAppVersion()).toBe(`${appConfig.expo.version} (${appConfig.expo.android.versionCode})`);
      expect(isolated.getClientMetadataHeaders()).toEqual({
        'X-App-Version': `${appConfig.expo.version} (${appConfig.expo.android.versionCode})`,
        'X-Platform': 'android',
      });
    } finally {
      Object.defineProperty(isolatedPlatform, 'OS', { value: prevOs, configurable: true });
      jest.doMock('expo-application', () => ({
        __esModule: true,
        nativeApplicationVersion: '1.0.1',
        nativeBuildVersion: '3',
        applicationId: 'com.thegentlemenofjuthathep.animalcollection',
      }));
      jest.resetModules();
    }
  });
});
