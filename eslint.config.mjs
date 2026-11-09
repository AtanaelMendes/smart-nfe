import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    // Padrões de compilação Next.js
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/node_modules/**",
    "next-env.d.ts",
    // Código legado e dead code herdado do template RH anterior
    "app/dev/**",
    "app/assets/**",
    "plugins/**",
    "app/components/Layouts/Iframe.jsx",
    "app/components/Layouts/ModalGrid.jsx",
    "app/components/Layouts/Notifications.jsx",
    "app/components/Layouts/Notifications/**",
    "app/components/Layouts/Pagination.jsx",
    "app/components/Layouts/Sidebar.jsx",
    "app/components/Layouts/SortControl.jsx",
    "app/components/Layouts/MiniSidebar.jsx",
    "app/components/Layouts/TimelineModal.jsx",
    "app/components/buttons/ButtonToggle.jsx",
    "app/components/buttons/ButtonDropDown.jsx",
    "app/components/buttons/Dropdown.jsx",
    "app/components/buttons/WhatsappButton.jsx",
    "app/components/chart/**",
    "app/components/chatbot/**",
    "app/components/notifications/**",
    "app/components/selecao/**",
    "app/components/inputs/RangeSlider.jsx",
    "app/components/inputs/RangeSliderWithTooltip.jsx",
    "app/components/inputs/**",
  ]),
]);

export default eslintConfig;
