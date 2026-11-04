# Copilot Instructions for template_next

## Project Overview
**template_next** is a Next.js 16 + React 19 SaaS frontend for an HR management platform (RHBrasil). It uses Tailwind CSS for styling and supports multi-environment builds (development, homolog, production).

## Architecture & Key Patterns

### Path Aliases & Imports
- **Base URL**: `jsconfig.json` defines `@/*` → `./src/*`
- **Actual Structure**: Components use `@/components`, `@/assets/utils`, etc., but these map to `app/components`, `app/assets` in practice
- **Always use path aliases** when importing (e.g., `import Button from '@/components/buttons/Button'` not relative paths)

### Component Organization
Components are organized by feature domain in `app/components/`:
- **buttons/**: Reusable button variants (Button.jsx, ButtonDropDown, ButtonToggle, FloatActionButton, etc.)
- **inputs/**: Form inputs with validation masks (InputText with CPF/CNPJ masking, DatePicker, Checkbox, Radio, etc.)
- **cards/**: Domain-specific card components (CardEmprego, CardCompetencia, CardCurso, CardIdioma, etc.)
- **chart/**: Data visualization (AnswersChart, MapChart, MultiAxisLineChart, PieChart, UserHoursBarChart)
- **Feature domains**: busca-candidatos, candidatos, cargos, centroDeCusto, cliente, recrutamento, selecao, vagas, turnos, etc.

### Styling with Tailwind CSS
- **Custom color scheme**: Primary (`rgb(28, 100, 242)` - blue), Secondary (`rgb(255, 150, 0)` - orange), plus danger/warning variants
- **Custom shadows**: `drop-shadow-1` through `drop-shadow-9` and `white-shadow-1` through `white-shadow-9` (opacity scale)
- **Responsive breakpoints**: sm (576px), md (768px), lg (1024px), tc (1280px), xl (1560px), 2xl (1920px)
- **Custom animations**: `loading`, `rotate-y`, `loading-slide`, `loading-wave` with custom keyframes
- **Pattern**: Use `cn()` utility (from `@/assets/utils`) to conditionally merge Tailwind classes

### Component Pattern Example
```jsx
// app/components/buttons/Button.jsx shows the pattern
const btnType = (outline, bordered, buttonType) => {
  const variants = {
    primary: cn(
      outline ? 'text-primary hover:bg-blue-200' : 'bg-primary text-white hover:bg-blue-700',
      bordered && 'border border-primary', 'focus:ring-blue-300'
    ),
    // ... other variants
  };
};

// Props combine size, variant, shape (pill/square), state (disabled), layout (block/inline)
const generateButtonClass = (buttonType, pill, square, size, block, outline, bordered, disabled) => { ... }
```

### Form Input Pattern
- Inputs accept `value`, `onChange`, `onBlur`, `label`, `helperText`, `required`, `disabled`, `readOnly`, `hint`, `maxLength`, `loading`, `clearable`
- **InputText.jsx** demonstrates: masking (CPF/CNPJ), label rendering, validation hints, loading states, clear buttons
- Custom masks exist for CPF, CNPJ, NIT, PIS formats (check InputText.jsx for pattern)

### API Communication
- **plugins/axios.js**: Configured axios instance with:
  - Base URL from `NEXT_PUBLIC_API_URL` environment variable
  - Timeout: 30 seconds
  - Credentials enabled (withCredentials: true)
  - **Request interceptor**: Tracks start time for response timing
  - **Response interceptor**: Warns if request > 10s delay, auto-redirects to `/login` on 401 status
  - Uses `react-toastify` for notifications

### Card Component Pattern
- `CardTitle`: Styled header with optional color variants (primary/success/warning/danger), click handlers, action buttons
- `CardActions`: Footer section for buttons/actions
- Example in `app/components/cards/Card.jsx`

## Environment & Build Configuration

### Environment Setup
Create `.env.local` in project root with:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_RELATIVE_PATH=http://localhost:3000
NEXT_WEBSOCKET_URL=ws://localhost:9990/notify
BUILD_ENV=development
```

### Build Environments
Three distinct builds with separate configs:
1. **Development**: `npm run dev` - uses `.env.local`, base path empty, output to `.next/`
2. **Homolog**: `npm run build:homolog` - uses `.env.hmlg`, base path `/saas`, output to `homolog/` folder
3. **Production**: `npm run build:prod` - uses `.env.pdct`, base path `/saas`, output to `production/` folder

### Build Scripts (Windows batch files)
- `build_homolog.bat`: Swaps `.env.local` → `.env.hmlg`, runs Next.js build with `BUILD_ENV=homolog`
- `build_prod.bat`: Swaps `.env.local` → `.env.pdct`, runs Next.js build with `BUILD_ENV=production`
- **Critical**: Development server must be stopped before running `build:homolog` or `build:prod`
- After commit, **restore `.env.local`** before next local development

### Build ID Tracking
- `next.config.js` generates unique `build-id.json` in `public/` during build (timestamp-based)
- Enables cache busting on deployments

### Static Export & Pipeline
- `output: 'export'` in next.config.js - generates static files (no Node.js runtime needed)
- Bitbucket Pipelines copies compiled `production/` and `homolog/` folders to server during deployment

## Development Workflow

1. **Local Development**:
   - `npm install` (or `pnpm install`)
   - Create `.env.local` from `.env.pdct` template, update endpoints
   - `npm run dev` → http://localhost:3000

2. **Before Committing**:
   - Run `npm run build:homolog` and `npm run build:prod` to verify builds
   - Verify `.env.local` is restored after builds (not committed)
   - Built `homolog/` and `production/` folders are committed, not `.env` files

3. **Linting**:
   - `npm run lint` runs ESLint (eslint-config-next with core web vitals)
   - ESLint disabled during homolog/prod builds (see `next.config.js`)

4. **Common Issues**:
   - If build fails: check dev server is stopped (`npm run dev`)
   - If imports fail: verify `@/` path alias usage, not relative paths
   - If styles wrong: check Tailwind class names (custom colors like `primary`, `secondary`, shadow scales)

## Code Quality & Conventions

### Naming
- **Components**: PascalCase (e.g., `InputText`, `CardCompetencia`, `FiltroBasico`)
- **Utility functions**: camelCase
- **Files**: Match component export name in `.jsx` (not separate `.js` files for utils yet)

### React Patterns
- Functional components with hooks (`useState`, `useCallback`, `useEffect`)
- `reactStrictMode: false` in next.config.js (no double-render in dev - intentional choice)
- No PropTypes or TypeScript (JavaScript project with JSX)

### Component Composition
- Reusable primitives (Button, InputText, Radio, Checkbox) in `buttons/` and `inputs/`
- Specific domain components (FilteroBasico, HistoricoVagaCandidato) in feature folders
- Composed from primitives and Layouts (Typography, SmallLoading, TooltipComponent)

### Image Handling
- `next/image` imported but with `unoptimized: true` (static export doesn't optimize)
- Allowed domains: localhost, www.tickflow.com.br
- SVG allowed with custom CSP

## Common File Locations
- **Styles**: Tailwind classes inline; global CSS in `app/globals.css`
- **Utilities**: Import `cn` from `@/assets/utils` for class merging
- **Layouts**: `app/components/Layouts/` contains Typography, SmallLoading, TooltipComponent, etc.
- **API calls**: Use axios instance from `plugins/axios.js`
- **Pages**: `app/page.jsx` (root), `app/login/page.jsx`, `app/dashboard/page.jsx` (Next.js app router)

## Red Flags & Gotchas
- ❌ Don't use relative imports (e.g., `../components/Button`) - use `@/` aliases
- ❌ Don't forget to check build succeeds before committing
- ❌ Don't modify `.env` files in git - they're templates only
- ❌ Don't remove `reactStrictMode: false` - specific to this project
- ✅ Always use Tailwind classes from theme customization when available (primary vs #1c64f2)
- ✅ Check InputText/form components accept your required props before creating new input types
