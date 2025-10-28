const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver = config.resolver || {};
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "expo-router": path.resolve(projectRoot, "src/router/expo-router"),
  "@tanstack/react-router": path.resolve(projectRoot, "src/router/tanstack"),
  "@tanstack/react-query": path.resolve(projectRoot, "src/query"),
};

module.exports = config;
