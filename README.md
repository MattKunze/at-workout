# AT Workout

A React + TypeScript application for managing fitness integrations.

## Getting Started

### Prerequisites

- Node.js 18+
- Go 1.21+ (for building the Peloton OAuth helper)
- just (command runner)

### Installation

```bash
npm install
```

### Building

Build all components including the Peloton OAuth helper:

```bash
just build
```

Or build just the Peloton OAuth helper:

```bash
just build-peloton-oauth
```

### Development

```bash
npm run dev
```

## Features

### Peloton Integration

The application includes Peloton API integration for connecting user accounts. The OAuth flow is handled by a Go binary (`cmd/peloton-oauth/main.go`) which is executed from the Node.js server.

**How it works:**

1. User enters Peloton credentials in the UI
2. Node.js server executes the Go binary with credentials as environment variables
3. Go binary completes the OAuth PKCE flow and returns an access token
4. Access token is stored in browser localStorage

**Building:** The Peloton OAuth helper must be built before running the app:

```bash
just build-peloton-oauth
```

This creates `build/peloton-oauth` which is executed by the server during authentication.

## Project Structure

- `src/` - React/TypeScript frontend and server code
- `cmd/peloton-oauth/` - Go binary for Peloton OAuth flow
- `build/` - Compiled binaries (gitignored)

## CI/CD

This project uses GitHub Actions for CI/CD:

### Pull Request Validation
- Runs linting and type checking on all PRs targeting `main`
- Workflow defined in `.github/workflows/ci.yml`

### Deployment
- Builds Docker image on push to `main` branch
- Pushes to GitHub Container Registry (ghcr.io)
- Workflow defined in `.github/workflows/deploy.yml`
- Tagged as `latest` and with commit SHA (e.g., `abc1234`)
- OAuth configuration is baked into the image at build time

**Important**: OAuth environment variables (`VITE_OAUTH_CLIENT_ID`, `VITE_OAUTH_REDIRECT_URI`) are **build-time** variables. They are hardcoded in the GitHub Actions workflow and bundled into the JavaScript during the Docker build. Runtime `.env` files do not affect these values.

### Self-Hosted Deployment

The application is deployed using Docker Compose with Watchtower for automatic updates.

**Image location**: `ghcr.io/mattkunze/at-workout:latest`

**Deployment steps:**

1. Copy `docker-compose.production.yml` to your server
2. Start the services (no `.env` file needed for OAuth):
   ```bash
   docker-compose -f docker-compose.production.yml up -d
   ```
3. Watchtower will automatically pull and deploy new images every 5 minutes

**Note**: OAuth configuration (`VITE_OAUTH_CLIENT_ID`, `VITE_OAUTH_REDIRECT_URI`) is baked into the Docker image at build time via GitHub Actions. Runtime environment variables do not affect the OAuth configuration. To change OAuth settings, update `.github/workflows/deploy.yml` and trigger a new build.

**Monitoring:**
```bash
# View application logs
docker logs at-workout

# View Watchtower logs
docker logs watchtower

# Check running containers
docker ps
```

**Manual update:**
```bash
docker-compose -f docker-compose.production.yml pull
docker-compose -f docker-compose.production.yml up -d
```

---

# Original Vite Template README

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
