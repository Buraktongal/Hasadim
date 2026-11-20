// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/i18n/en.ts'],
  },
  {
    rules: {
      // Ekran açılınca veri yükleme (fetch → setState) bilinçli olarak efekt içinde yapılıyor.
      'react-hooks/set-state-in-effect': 'off',
      // useRef(new Animated.Value(0)).current React Native'in belgelenmiş kullanımıdır.
      'react-hooks/refs': 'off',
    },
  },
]);
