import NextAuth from "next-auth";
import type { AdapterUser } from "next-auth/adapters"
import NeonAdapter from '@auth/neon-adapter';
import { Pool } from "@neondatabase/serverless"

import { cache } from "react";

import { authConfig } from "./config";
import { env } from "~/env";
import { nanoid } from "nanoid";

const { auth: uncachedAuth, handlers, signIn, signOut } = NextAuth(() => {
  const pool = new Pool({ connectionString: env.DATABASE_URL })

  const raw = NeonAdapter(pool);
  const adapter = {
    ...raw,
    createUser: async (data: AdapterUser) => {
      if (typeof raw.createUser !== "function") {
        throw new Error("Adapter.createUser is not implemented");
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
        throw new Error("Failed to create user");
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
