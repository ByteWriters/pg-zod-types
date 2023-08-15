/**
 * Default pg_type to zod type map
 * Can be overridden via config
 * Keys are matched on substring (timestamptz -> timestamp, int4 -> int)
 */

import z from 'zod';

export const pg2zodType = {
  uuid: z.string().uuid(),
  serial: z.number().int(),

  bool: z.boolean(),

  double: z.number(),
  int: z.number().int(),

  text: z.string(),
  timestamp: z.string().datetime(),

  json: z.any(),

  // enum: z.nativeEnum(),  ACCEPTS ENUM AS INPUT

  default: z.string()
}
