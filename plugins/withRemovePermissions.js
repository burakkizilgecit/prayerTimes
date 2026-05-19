const { withAndroidManifest } = require('@expo/config-plugins');

const REMOVE = [
  'android.permission.ACTIVITY_RECOGNITION',
];

module.exports = function withRemovePermissions(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    const perms = manifest['uses-permission'] ?? [];
    manifest['uses-permission'] = perms.filter(
      (p) => !REMOVE.includes(p.$?.['android:name'])
    );
    return config;
  });
};
