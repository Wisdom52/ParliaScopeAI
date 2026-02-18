const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Watch the shared directory for changes
config.watchFolders = [path.resolve(__dirname, '../shared')];

// Allow Metro to resolve files in the shared directory
config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
];

// Map @shared to the actual directory
config.resolver.extraNodeModules = {
    '@shared': path.resolve(__dirname, '../shared'),
};

module.exports = config;
