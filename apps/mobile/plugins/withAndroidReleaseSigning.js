const { withAppBuildGradle, withAndroidManifest } = require('@expo/config-plugins');

// EAS injects its configured credentials itself. Local release builds must
// explicitly supply a release key; never fall back to debug signing.
module.exports = config => {
  config = withAndroidManifest(config, mod => {
    mod.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 'false' : 'true';
    return mod;
  });
  return withAppBuildGradle(config, mod => {
  if (process.env.EAS_BUILD === 'true') return mod;
  let text = mod.modResults.contents;
  if (!text.includes('// Animal Collection release signing')) {
    text = text.replace('signingConfigs {', `signingConfigs {
        // Animal Collection release signing
        release {
            def releasePath = System.getenv("ANIMAL_RELEASE_STORE_FILE")
            if (releasePath) {
                storeFile file(releasePath)
                storePassword System.getenv("ANIMAL_RELEASE_STORE_PASSWORD")
                keyAlias System.getenv("ANIMAL_RELEASE_KEY_ALIAS")
                keyPassword System.getenv("ANIMAL_RELEASE_KEY_PASSWORD")
            }
        }`);
  }
  text = text.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/, '$1signingConfigs.release');
  mod.modResults.contents = text;
  return mod;
  });
};
