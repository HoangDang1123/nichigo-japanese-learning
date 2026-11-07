<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UI Loading States and Skeleton Policy

Before frontend implementation, inventory genuine asynchronous sources and their boundaries. Define loading, success, empty, error, and applicable refreshing states together. For initial data-backed loading, compose the shared `src/components/ui/skeleton.tsx` primitive into a layout that matches the loaded region's approximate dimensions on desktop and mobile. Use semantic Light/Dark/System tokens; give the parent region one meaningful busy announcement while keeping shapes decorative, nonfocusable, and reduced-motion safe. Keep valid content visible during background refresh when possible. Never mask an empty, failed, or unavailable result with an indefinite skeleton, fabricate progress or other business data, or add artificial delays. Test transitions from loading to content and to empty/error states, and review Light/Dark appearance at desktop and mobile widths. Include applicable loading coverage in the feature's Definition of Done. Synchronous UI does not need a skeleton. See the root `AGENTS.md`, `docs/07-DESIGN-SYSTEM.md#skeleton-loading-system`, and `docs/implementation/JPN-UI-003-skeleton-system.md`.
