"use client"
import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "./components/ui/button"
import App from "./table/page"

export default function Page() {
  const { data: session, status } = useSession();
  if (status === "loading") return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white"
    >
      <p>Loading…</p>
    </div>
  )
  if (!session) return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white"
    >
      <Button
        onClick={() => signIn("google")}
        className="bg-blue-500 text-white hover:bg-blue-600"
        variant={"outline"}
        size={"lg"}
      >
        Sign in with Google
      </Button>
    </div>
  )
  return (
    <div
      className="flex flex-col items-center space-y-4 h-screen w-full"
    >
      <div
        className="flex items-center justify-center w-full space-x-4 h-16 bg-gray-800 text-white"
      >
        <p>Signed in as {session.user?.email}</p>
        <Button variant={"ghost"} onClick={() => signOut()}
          className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
        >
          {`> Sign out`}
        </Button>
      </div>
      <div
        className="flex flex-col h-full w-full"
      >
        <App />
      </div>
    </div>
  )
}
