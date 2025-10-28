# Development Commands
- `pnpm build` - Build the project with esbuild
- `pnpm dev` - Start development server with watch mode

# Code Style Guidelines
- Use JavaScript with ESNext syntax
- ESNext modules with bundler resolution
- Entry point: `src/main.js` → `dist/bundle.js`
- Use ESBuild for bundling and minification
- Source maps enabled for debugging
- Consistent casing for file names enforced
- Import style: ES6 import/export syntax
- No linting tools configured - follow JavaScript conventions
- Package manager: pnpm (v10.19.0)

# FILES TO IGNORE

NEVER EVER EVER OUTPUT READ CALLS TO THE CONTENT OF dist/