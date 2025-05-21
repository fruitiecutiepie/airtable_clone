import { Pool } from '@neondatabase/serverless';
import { env } from '~/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL
});
