import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_API_SECRET: z.string().min(16, 'APP_API_SECRET must be at least 16 characters'),
  RUNPOD_API_KEY: z.string().min(1, 'RUNPOD_API_KEY is required'),
  RUNPOD_API_BASE: z.string().url().default('https://api.runpod.io/v2'),
  RUNPOD_CONTAINER_DISK_GB: z.coerce.number().int().min(20).default(100),
  RUNPOD_VOLUME_GB: z.coerce.number().int().min(0).default(0),
  RUNPOD_POD_TEMPLATE_ID: z.string().optional().default(''),
  RUNPOD_POD_NAME: z.string().default('ComfyUI-Mobile')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
