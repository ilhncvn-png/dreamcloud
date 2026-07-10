const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root so Metro can find packages in the shared node_modules
config.watchFolders = [monorepoRoot];

// Tell Metro where to look for modules — project first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// In a workspace monorepo, Metro's serverRoot is set to the monorepo root.
// This causes expo/AppEntry.js to try to import ../../App from the monorepo
// root instead of the mobile project root, which doesn't exist.
// Fix: redirect the classic AppEntry bundle URL to the virtual metro entry,
// which properly resolves the main field (expo-router/entry) in package.json.
const defaultRewriteRequestUrl = config.server?.rewriteRequestUrl;
config.server = config.server ?? {};
config.server.rewriteRequestUrl = (url) => {
  if (url.includes('/node_modules/expo/AppEntry.bundle')) {
    const redirected = url.replace(
      '/node_modules/expo/AppEntry.bundle',
      '/.expo/.virtual-metro-entry.bundle',
    );
    return defaultRewriteRequestUrl ? defaultRewriteRequestUrl(redirected) : redirected;
  }
  return defaultRewriteRequestUrl ? defaultRewriteRequestUrl(url) : url;
};

module.exports = config;
