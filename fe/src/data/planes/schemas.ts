import { z } from 'zod';

export const planeBasicSchema = z.object({
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number(),
  color: z.string(),
});

export const planesMessageSchema = z.object({
  type: z.literal('planes'),
  data: z.array(planeBasicSchema),
});
