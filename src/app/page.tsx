"use client"
import { signIn, useSession } from "next-auth/react"
import BaseList from "~/app/[baseId]/BaseList";
import Header from "./components/Header";
import { Button } from "./components/ui/Button";

export default function Page() {
  const { data: session, status } = useSession();

  if (status === "loading") return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white"
    >
      <p>Loading…</p>
    </div>
  )

  if (!session) {
    return (
      <div className="flex min-h-screen gap-2 flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <p
          className="text-lg text-center mb-4"
        >
          Please sign in to continue.
        </p>
        <Button
          onClick={() => signIn("google")}
          className="bg-blue-500 text-white hover:bg-blue-600"
          variant={"outline"}
          size={"lg"}
        >
          Sign in with Google
        </Button>
      </div>
    );
  }

  return (
    <div
      className="bg-background min-h-screen flex flex-col"
    >
      <Header />
      <div
        className="flex flex-col items-center py-8 px-12 gap-6"
      >
        <h1
          className="text-2xl font-bold w-full"
        >
          Home
        </h1>
        <div
          className="flex flex-col h-full w-full"
        >
          <BaseList userId={session.user.public_id} />
        </div>
      </div>
    </div>
  )
}
