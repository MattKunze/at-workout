# Project Agent Instructions

## Quality Standards
- **Verification:** After completing any feature or modification, always run the project's linting (`npm run lint`) and type-checking (`npm run typecheck`) commands.
- **Resolution:** All errors and warnings introduced by your changes must be resolved before the task is considered complete.

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
