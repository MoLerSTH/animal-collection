module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};

// --- Previous NativeWind wiring, restore once compatible: ---
// presets: [
//   ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
//   'nativewind/babel',
// ],
