const { getDefaultConfig } = require('expo/metro-config');

// NativeWind temporarily disabled: as of Sept 2026, nativewind's stable (v4)
// metro transformer breaks under Expo SDK 57's Metro (0.84.5), and the v5
// preview requires a full Tailwind v4 migration (postcss.config, no more
// tailwind.config.js). Re-enable once nativewind ships an SDK 57-compatible
// release. See conversation history for the exact errors hit.
const config = getDefaultConfig(__dirname);

module.exports = config;

// --- Previous NativeWind wiring, restore once compatible: ---
// const { withNativeWind } = require('nativewind/metro');
// module.exports = withNativeWind(config, { input: './src/app/global.css' });