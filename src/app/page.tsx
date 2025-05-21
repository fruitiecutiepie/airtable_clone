"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "./components/ui/button"
import App from "./table/page"

export default function Page() {
  const { data: session, status } = useSession()
  if (status === "loading") return <p>Loading…</p>
  if (!session) return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white"
    >
      <Button onClick={() => signIn("google")}>
        Sign in with Google
      </Button>
    </div>
  )
  return (
    <div
      className="flex flex-col items-center space-y-4"
    >
      <p>Signed in as {session.user?.email}</p>
      <Button variant={"ghost"} onClick={() => signOut()}>
        Sign out
      </Button>
      <div
        className="flex flex-col h-full w-full"
      >
        <App />
      </div>
    </div>
  )
}
