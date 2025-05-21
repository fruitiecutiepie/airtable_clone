import NextAuth from "next-auth";
import PostgresAdapter from '@auth/pg-adapter';
import { Pool } from "@neondatabase/serverless"

import { cache } from "react";

import { authConfig } from "./config";
import { env } from "~/env";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  return {
    ...authConfig,
    adapter: PostgresAdapter(pool)
  }
});

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
