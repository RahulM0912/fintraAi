---
description: 'Use when creating or modifying React components. Enforces 150-line limit per component and separation of UI logic from business logic through custom hooks.'
applyTo: 'src/**/*.tsx'
---

# React Component Guidelines

## Core Rules

### 1. Component Size Limit: 150 Lines

Components must not exceed 150 lines. If a component approaches this limit, automatically extract logic into smaller sub-components or custom hooks.

**Why**: Smaller components are easier to test, understand, and maintain. They improve code reusability and reduce cognitive load.

**How to split**:

- Extract render-only sections into separate UI components
- Move complex state and side effects into custom hooks
- Create wrapper components that compose smaller pieces

### 2. Separate UI from Logic

Keep presentation logic separate from business logic by using custom hooks for state management, data fetching, and side effects.

**Pattern**:

// ❌ DO NOT: Mix logic and UI in one component

## Implementation Guidelines

1. **Extract hooks early**: If a component has more than one `useState` or `useEffect`, consider a custom hook
2. **Sub-component folders**: For complex components, create a folder with:
   - `ComponentName.tsx` (UI only)
   - `useComponentLogic.ts` (hook with logic)
   - `ComponentName.types.ts` (TypeScript types)
3. **Prefer composition**: Build larger features by composing small, focused components
4. **Test splitting**: Test custom hooks independently from components

## Examples in This Project

The project already follows this pattern in several areas:

- `useConversation()` and `useChatInput()` — hooks separate chat logic
- `ChatInput.tsx` and `AiResponse.tsx` — focused UI components
- `chartModalContext.ts` + `chartModal.tsx` — separated context logic from rendering

Maintain and expand this pattern across the codebase.
