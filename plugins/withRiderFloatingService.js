const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

const SERVICE_NAME = '.RiderFloatingService';
const PACKAGE_REGISTRATION = 'add(RiderFloatingServicePackage())';

function copyRecursive(source, destination) {
  if (!fs.existsSync(source)) return;

  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(destination, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function ensurePermission(manifest, permissionName) {
  const permissions = manifest.manifest['uses-permission'] || [];
  const exists = permissions.some((item) => item.$?.['android:name'] === permissionName);
  if (!exists) {
    permissions.push({ $: { 'android:name': permissionName } });
  }
  manifest.manifest['uses-permission'] = permissions;
}

module.exports = function withRiderFloatingService(config) {
  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const sourceRoot = path.join(
        modConfig.modRequest.projectRoot,
        'plugins',
        'rider-floating-service',
        'android'
      );
      copyRecursive(sourceRoot, modConfig.modRequest.platformProjectRoot);
      return modConfig;
    },
  ]);

  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults;
    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE');
    ensurePermission(manifest, 'android.permission.FOREGROUND_SERVICE_LOCATION');
    ensurePermission(manifest, 'android.permission.SYSTEM_ALERT_WINDOW');

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const services = application.service || [];
    const exists = services.some((service) => service.$?.['android:name'] === SERVICE_NAME);
    if (!exists) {
      services.push({
        $: {
          'android:name': SERVICE_NAME,
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'location',
        },
      });
    }
    application.service = services;
    return modConfig;
  });

  config = withMainApplication(config, (modConfig) => {
    if (!modConfig.modResults.contents.includes(PACKAGE_REGISTRATION)) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /PackageList\(this\)\.packages\.apply\s*\{/,
        (match) => `${match}\n              ${PACKAGE_REGISTRATION}`
      );
    }
    return modConfig;
  });

  return config;
};
