# Project Agent Instructions

## Git and Version Control
- **DO NOT push changes to remote repositories unless explicitly requested by the user**
- **DO NOT run `git push` commands without explicit permission**
- You may create commits when requested, but always ask before pushing
- Exception: When the user explicitly asks you to "push" or "deploy" changes

## Quality Standards
- **Verification:** After completing any feature or modification, always run the project's linting (`npm run lint`) and type-checking (`npm run typecheck`) commands.
- **Resolution:** All errors and warnings introduced by your changes must be resolved before the task is considered complete.

## Component Architecture (Atomic Design)

This project follows **Atomic Design** principles to maintain a scalable and maintainable component architecture.

### Component Hierarchy

**Molecules (`src/components/molecules/`):**
- Stateless, prop-driven components
- No lifecycle methods or complex state management
- Pure presentation logic only
- Accept data and callbacks via props
- Examples: Form inputs, cards, profile displays

**Organisms (`src/components/organisms/`):**
- Stateful components with lifecycle management
- Can use hooks for business logic
- Compose multiple molecules together
- Handle data fetching, side effects, and complex interactions
- Examples: Full feature sections, data-driven panels

**Custom Hooks (`src/hooks/`):**
- Extract and encapsulate business logic from components
- Manage state, side effects, and API interactions
- Return data and handlers for components to use
- Enable reusability across multiple components
- Examples: Connection management, data fetching patterns

### Guidelines

1. **Keep molecules simple:** If a component needs `useEffect`, complex state, or business logic, it should be an organism or use a custom hook.

2. **Extract logic to hooks:** When an organism grows complex, extract business logic into custom hooks. Hooks should return all necessary state and handlers.

3. **Compose, don't duplicate:** Build organisms by composing molecules. Each molecule should have a single, clear responsibility.

4. **Props over state:** Molecules should receive all data via props. Organisms manage state and pass it down to molecules.

5. **Type everything:** All props interfaces should be explicitly defined and exported if reusable.

## Future Work: AT Protocol Type Generation
As the application expands to include features like creating posts or reading feeds, we should transition from manual type casting to automatic Lexicon type generation for full type safety.

**Goal:**
Generate TypeScript definitions from official `app.bsky` Lexicons to enable strict typing for `Client` interactions.

**Steps:**
1.  **Install Tools:** Add `lex-cli` or similar ATProto type generation tools.
2.  **Generate Types:** Run the generation command against standard `app.bsky` schemas to produce a `src/lexicon.ts` (or similar).
3.  **Integrate:** Update usages of `Client` to use the generated generic types:
    ```typescript
    import { DefaultService } from './lexicon';
    const rpc = new Client<DefaultService>({ ... });
    ```
4.  **Refactor:** Remove manual casts (e.g., `as UserProfile`) and rely on the inferred types for API responses and parameters.
