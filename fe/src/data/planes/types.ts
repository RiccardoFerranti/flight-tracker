import type { z } from 'zod';

import type {
  planeBasicSchema,
  planeDetailedSchema,
  planeDetailsMessageSchema,
  planesMessageSchema,
} from './schemas';

export type PlaneBasic = z.infer<typeof planeBasicSchema>;
export type TrackedPlane = PlaneBasic & {
  heading: number | null;
};
export type PlanesMessage = z.infer<typeof planesMessageSchema>;
export type PlanesSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export type PlaneDetailed = z.infer<typeof planeDetailedSchema>;
export type PlaneDetailsMessage = z.infer<typeof planeDetailsMessageSchema>;
export type PlaneDetailsSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
