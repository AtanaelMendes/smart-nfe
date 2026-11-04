import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    // Padrões de compilação Next.js
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Código legado e dead code herdado do template RH anterior
    "app/dev/**",
    "app/assets/photo-modal.js",
    "plugins/**",
  ]),
]);

export default eslintConfig;
