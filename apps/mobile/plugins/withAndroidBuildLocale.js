const { withGradleProperties } = require('expo/config-plugins');

// apkzlib uses Calendar.getInstance() for ZIP timestamps. A Thai build host can
// supply Buddhist years (2569), beyond ZIP's supported Gregorian range.
// Scope the locale to the build JVM; the app still uses the device's locale.
module.exports = function withAndroidBuildLocale(config) {
  return withGradleProperties(config, config => {
    let jvmArgs = config.modResults.find(
      item => item.type === 'property' && item.key === 'org.gradle.jvmargs',
    );
    if (!jvmArgs) {
      jvmArgs = { type: 'property', key: 'org.gradle.jvmargs', value: '' };
      config.modResults.push(jvmArgs);
    }

    const existingArgs = jvmArgs.value
      .replace(/(?:^|\s)-Duser\.(?:language|country)=\S+/g, '')
      .trim();
    jvmArgs.value = [existingArgs, '-Duser.language=en', '-Duser.country=US']
      .filter(Boolean)
      .join(' ');
    return config;
  });
};
