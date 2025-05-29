import type { DefaultUser } from "next-auth";

declare module "next-auth" {
  export interface User extends DefaultUser {
    public_id: string
  }
  export interface Session {
    user: User;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    public_id: string
    accessToken?: string
  }
}
