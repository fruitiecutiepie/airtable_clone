"use client"

import React from 'react'
import { Button } from '../components/ui/Button'
import { Avatar } from 'radix-ui'
import { useBases } from '../hooks/useBases'

interface BaseListProps {
  userId: string
}

export default function BaseList(
  { userId }: BaseListProps
) {
  const {
    bases,
    basesStatus,

    addBase,
    updateBase,
    deleteBase,

    baseOnClick,
    addBaseOnClick
  } = useBases(
    userId
  );

  // if (basesStatus === "pending") {
  //   return (
  //     <div className="flex items-center justify-center w-full h-full">
  //       Loading bases...
  //     </div>
  //   )
  // }

  if (basesStatus === "error") {
    console.error("Error loading bases:", basesStatus);
    return (
      <div className="flex items-center justify-center w-full h-full">
        Error loading bases. Please try again later.
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full gap-4">
      <Button
        variant={"default"}
        onClick={addBaseOnClick}
        disabled={addBase.isPending}
        className="w-48 cursor-pointer hover:bg-secondary transition-colors duration-200"
      >
        + New Base
      </Button>
      {bases && bases.length > 0 ? (
        <div className="flex gap-4">
          {bases?.map((b) => (
            <div
              className="w-fit"
              key={b.id}
            >
              <button
                key={b.id}
                onClick={async () => await baseOnClick(b.id)}
              >
                <div>
                  <div
                    className={`
                      inline-flex items-center gap-4 rounded-md p-4
                      bg-white shadow-sm w-72 outline-1 outline-gray-300
                      hover:outline-gray-500
                      hover:shadow-md transition-shadow duration-200
                    `}
                  >
                    <div
                      className={`
                        rounded-lg h-12 w-12 inline-flex items-center justify-center
                        outline-1 outline-gray-300 bg-orange-700 text-white
                      `}
                    >
                      <Avatar.Root
                        className={`
                          inline-flex items-center justify-center align-middle overflow-hidden
                        `}
                      >
                        <Avatar.Fallback
                          delayMs={600}
                          className="w-full h-full flex items-center justify-center font-medium"
                        >
                          {b.name.slice(0, 2).toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar.Root>
                    </div>
                    <div
                      className="flex flex-col items-start justify-center gap-1"
                    >
                      <h3 className="text-sm font-semibold mt-1">
                        {b.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Base
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-xs">
          No bases found. Create a new base to get started.
        </div>
      )}
    </div>
  )
}
