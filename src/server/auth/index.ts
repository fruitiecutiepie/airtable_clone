import NextAuth from "next-auth";
import type { AdapterUser } from "next-auth/adapters"
import NeonAdapter from '@auth/neon-adapter';
import { TRPCError } from "@trpc/server";
import { Pool } from "@neondatabase/serverless"
import { cache } from "react";
import { nanoid } from "nanoid";

import { authConfig } from "./config";
import { env } from "~/env";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: env.DATABASE_URL })

  const raw = NeonAdapter(pool);
  const adapter = {
    ...raw,
    createUser: async (data: AdapterUser) => {
      if (typeof raw.createUser !== "function") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Adapter.createUser is not implemented",
        });
      }
      const pub = nanoid();
      const { rows: [user] } = await pool.query<AdapterUser & { public_id: string }>(`
        INSERT INTO users(name, email, "emailVerified", image, public_id)
        VALUES(
          $1, $2, $3, $4, $5
        )
        RETURNING id, name, email, "emailVerified", image, public_id
      `, [
        data.name ?? null,
        data.email ?? null,
        data.emailVerified ?? null,
        data.image ?? null,
        pub
      ]);
      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      pool.on("connect", async (client: Pool) => {
        await client.query(
          `SET app.current_user = $1`,
          [user.public_id]
        );
      });

      return user;
    }
  };

  return {
    ...authConfig,
    adapter
  }
});

const auth = cache(uncachedAuth);

export { auth, handlers, signIn, signOut };
