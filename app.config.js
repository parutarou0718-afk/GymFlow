const staticConfig = require('./app.json').expo;

function createAppConfig(environment = process.env.EXPO_PUBLIC_GYMFLOW_ENV, baseConfig = staticConfig) {
  const allowsLocalHttp = environment === 'development' || environment === 'test';
  const existingPlugins = baseConfig.plugins ?? [];
  const pluginsWithoutBuildProperties = existingPlugins.filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== 'expo-build-properties');
  return {
    ...baseConfig,
    plugins: [...pluginsWithoutBuildProperties, ['expo-build-properties', { android: { usesCleartextTraffic: allowsLocalHttp } }]],
  };
}

module.exports = ({ config }) => createAppConfig(process.env.EXPO_PUBLIC_GYMFLOW_ENV, config ?? staticConfig);
module.exports.createAppConfig = createAppConfig;
