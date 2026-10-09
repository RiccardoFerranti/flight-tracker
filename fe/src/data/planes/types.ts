import type { z } from 'zod';

import type { planeBasicSchema, planesMessageSchema } from './schemas';

export type PlaneBasic = z.infer<typeof planeBasicSchema>;
export type TrackedPlane = PlaneBasic & {
  heading: number | null;
};
export type PlanesMessage = z.infer<typeof planesMessageSchema>;
export type PlanesSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
