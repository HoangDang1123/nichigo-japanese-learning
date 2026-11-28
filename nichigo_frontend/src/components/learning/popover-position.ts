/**
 * popover-position.ts — Keeps a fixed-position popover fully inside the viewport (320 px phones included).
 * Pure function so it can be tested without a DOM.
 */
export interface Box { left: number; top: number; right: number; bottom: number }
export interface Size { width: number; height: number }
export interface PopoverPlacement { left: number; top: number; width: number }

export const POPOVER_MARGIN = 16;
export const POPOVER_GAP = 8;
export const POPOVER_MAX_WIDTH = 320;

/** Prefers below the trigger, flips above when it does not fit, and clamps both axes inside the viewport. */
export function placePopover(trigger: Box, viewport: Size, panelHeight: number): PopoverPlacement {
  const width = Math.max(0, Math.min(POPOVER_MAX_WIDTH, viewport.width - 2 * POPOVER_MARGIN));
  const maxLeft = Math.max(POPOVER_MARGIN, viewport.width - width - POPOVER_MARGIN);
  const left = Math.min(Math.max(trigger.left, POPOVER_MARGIN), maxLeft);
  const below = trigger.bottom + POPOVER_GAP;
  const above = trigger.top - POPOVER_GAP - panelHeight;
  const fitsBelow = below + panelHeight <= viewport.height - POPOVER_MARGIN;
  const preferred = fitsBelow ? below : above >= POPOVER_MARGIN ? above : below;
  const maxTop = Math.max(POPOVER_MARGIN, viewport.height - POPOVER_MARGIN - panelHeight);
  return { left, top: Math.min(Math.max(preferred, POPOVER_MARGIN), maxTop), width };
}
