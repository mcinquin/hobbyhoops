# Next.js / TypeScript best practices

Produce optimized, maintainable Next.js code following clean-code principles and a robust architecture: functional, performant, secure and maintainable.

## Code style and structure

- Write concise, technical TypeScript code with accurate examples.
- Use functional and declarative programming patterns; avoid classes.
- Favor iteration and modularization over code duplication.
- Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`).
- Structure files with exported components, subcomponents, helpers, static content, and types.
- Use lowercase with dashes for directory names (e.g., `components/auth-wizard`).

## Optimization

- Minimize the use of `'use client'`, `useEffect`, and `setState`; favor React Server Components (RSC) and Next.js server rendering features.
- Use dynamic imports for code splitting where it pays off.
- Use responsive design with a mobile-first approach.
- Optimize images: use WebP, include size data, lazy-load.

## Error handling and validation

- Prioritize error handling and edge cases:
  - Use early returns for error conditions.
  - Use guard clauses to handle preconditions and invalid states early.
  - Use custom error types for consistent error handling.
- Validate inputs and external data with Zod.

## UI and styling

- Use Tailwind CSS and the project's shadcn/ui components (built on Base UI — `@base-ui/react`, not Radix).
- Keep design and responsive patterns consistent across the app.

## State and data fetching

- Fetch data in Server Components where possible.
- Do not introduce a new state management or data-fetching library (Zustand, TanStack Query, …) without asking first; prefer what the project already uses.

## Security and performance

- Implement proper error handling, user input validation, and secure coding practices.
- Reduce load times and improve rendering efficiency.

## Testing and documentation

- Write unit tests with Vitest (`npm test`).
- Add clear, concise comments for complex logic only.
- Use JSDoc comments for exported functions and components.

## Workflow

1. Analyze the task and its constraints before writing code; break it into smaller parts.
2. For non-trivial changes, outline a plan first and weigh alternative approaches.
3. Implement step by step, following the practices above.
4. Review the result for edge cases, optimizations and security issues.
5. Before finishing, run the relevant checks: `npm run typecheck`, `npm run lint`, `npm test` (or `npm run ci` for everything).
