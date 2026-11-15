/**
 * Configuration schema
 */

import { z } from 'zod';
import { NRDGConfigSchema, type NRDGConfig, defaultConfig } from '@nullroot/core';

export { NRDGConfigSchema, type NRDGConfig, defaultConfig };

export const ConfigFileSchema = z.object({
  version: z.number().int().positive(),
  config: NRDGConfigSchema,
});

export type ConfigFile = z.infer<typeof ConfigFileSchema>;