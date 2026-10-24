import type { ConfigContext, ExpoConfig } from 'expo/config';

// OAuth client IDs are public app identifiers. No server API keys belong here.
export default ({ config }: ConfigContext): ExpoConfig => {
  const production = process.env.EXPO_PUBLIC_APP_ENV === 'production';
  const api = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (production) {
    let valid = false;
    try {
      const url = new URL(api || '');
      valid = url.protocol === 'https:' && !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(url.hostname) && !url.hostname.endsWith('.example');
    } catch {}
    if (!valid) throw new Error('Production requires EXPO_PUBLIC_API_BASE_URL with a public HTTPS origin.');
    const client = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
    if (!client.endsWith('.apps.googleusercontent.com') || client.includes('your_')) throw new Error('Configure production Google OAuth before building.');
    process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ||= `${api!.replace(/\/$/, '')}/privacy`;
  }
  config = {...config, android: {...config.android},
    extra: {...config.extra, ...(process.env.EAS_PROJECT_ID ? {eas: {projectId: process.env.EAS_PROJECT_ID}} : {})}};
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!iosClientId || iosClientId.includes('your_google_ios_client_id')) {
    return config as ExpoConfig;
  }
  const suffix = '.apps.googleusercontent.com';
  if (!iosClientId.endsWith(suffix)) {
    throw new Error('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID must be an iOS OAuth client ID ending in .apps.googleusercontent.com');
  }
  const iosUrlScheme = `com.googleusercontent.apps.${iosClientId.slice(0, -suffix.length)}`;
  return {
    ...config,
    plugins: (config.plugins ?? []).map(plugin =>
      (typeof plugin === 'string' ? plugin : plugin[0]) === '@react-native-google-signin/google-signin'
        ? ['@react-native-google-signin/google-signin', { iosUrlScheme }]
        : plugin,
    ),
  } as ExpoConfig;
};
