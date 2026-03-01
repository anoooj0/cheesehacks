const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...config.ios,
    config: {
      googleMapsApiKey,
    },
  },
  android: {
    ...config.android,
    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
});
