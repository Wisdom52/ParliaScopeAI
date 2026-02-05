# ParliaScope Milestone 2: Frontend & Mobile Core Launch

This milestone establishes the foundational frontend and mobile capability with a consistent design system.

## Setup Instructions

1. **Shared UI Kit**:
   - Located in the `shared` directory.
   - Design tokens defined in `shared/tokens.ts`.
   - Components implemented in `web/src/components/ui` and `mobile/components/ui`.

2. **Web Application**:
   - `cd web`
   - `npm install`
   - `npm run dev` to start the local development server.

3. **Mobile Application**:
   - `cd mobile`
   - `npm install`
   - `npx expo start` to start the Expo Go server.

## Success Criteria Checklist
- [x] **React (Web) repository initialization**: Created via Vite with TypeScript.
- [x] **Expo (Mobile) repository initialization**: Created via Create Expo App with TypeScript.
- [x] **Shared UI kit**: `Button`, `Input`, and `Modal` components created with consistent tokens.
- [x] **Hot-reloading**: Enabled by default in Vite and Expo.
- [x] **Design tokens consistently applied**: Used `shared/tokens.ts` for all UI components.
