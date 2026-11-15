/**
 * Compatibility data models
 */

import { z } from 'zod';
import type { Ecosystem } from '@nullroot/core';

export const CompatibilityEntrySchema = z.object({
  id: z.string().uuid(),
  ecosystem: z.enum([
    'quickshell',
    'hyprland',
    'qt-qml',
    'lua',
    'wayland',
    'linux-desktop',
  ]),
  component: z.string().min(1),
  api: z.string().min(1),
  firstSupported: z.string().min(1),
  deprecatedIn: z.string().optional(),
  removedIn: z.string().optional(),
  replacement: z.string().optional(),
  source: z.string().url(),
  verifiedDate: z.string().datetime(),
  notes: z.string().optional(),
});

export type CompatibilityEntry = z.infer<typeof CompatibilityEntrySchema>;

export const CompatibilityQuerySchema = z.object({
  ecosystem: z.enum([
    'quickshell',
    'hyprland',
    'qt-qml',
    'lua',
    'wayland',
    'linux-desktop',
  ]),
  component: z.string().optional(),
  api: z.string().optional(),
  version: z.string().optional(),
});

export type CompatibilityQuery = z.infer<typeof CompatibilityQuerySchema>;