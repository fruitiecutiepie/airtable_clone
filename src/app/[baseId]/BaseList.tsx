"use client"

import React from 'react'
import { Button } from '../components/ui/Button'
import { Avatar, Popover } from 'radix-ui'
import { useBases } from '../hooks/useBases'
import { EllipsisHorizontalIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PopoverSection } from '../components/ui/PopoverSection'
import { Pencil1Icon } from '@radix-ui/react-icons'

interface BaseListProps {
  userId: string
}

export default function BaseList(
  { userId }: BaseListProps
) {
  const {
    bases,
    basesError,
    basesIsLoading,

    // onAddBase,
    addBaseStatus,

    onUpdBase,
    onDelBase,

    baseOnClick,
    addBaseOnClick
  } = useBases(
    userId
  );

  if (basesError) {
    console.error("Error loading bases:", basesError);
    return (
      <div className="flex items-center w-full h-full text-sm">
        Error loading bases. Please try again later.
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full gap-4">
      <Button
        variant={"default"}
        onClick={addBaseOnClick}
        disabled={addBaseStatus === "pending"}
        className="w-48 cursor-pointer hover:bg-secondary transition-colors duration-200"
      >
        + New Base
      </Button>
      {basesIsLoading && (
        <div className="flex items-center justify-center w-full h-full text-sm" >
          Loading bases...
        </div>
      )}
      {/* Render bases */}
      {!basesIsLoading && bases !== undefined && (
        bases.length > 0 ? (
          <div className="flex gap-4 flex-wrap">
            {bases?.map((b) => (
              <div
                className="w-fit cursor-pointer"
                key={b.id}
              >
                <div
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
                        className="flex items-center w-12"
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
                      </div>
                      <div
                        className="flex flex-row items-center justify-between w-full h-11"
                      >
                        <div
                          className="flex flex-col items-start justify-center gap-1 w-full"
                        >
                          <h3 className="text-sm font-semibold mt-1">
                            {b.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Base
                          </p>
                        </div>
                        <div
                          className="flex flex-col h-full items-end justify-between"
                        >
                          <Popover.Root>
                            <Popover.Trigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                              className={`
                              h-5 w-5 inline-flex cursor-pointer
                            `}
                            >
                              <EllipsisHorizontalIcon className="w-5 h-5 text-gray-500 hover:text-black cursor-pointer" />
                            </Popover.Trigger>
                            <Popover.Content
                              key={b.id}
                              sideOffset={5}
                              align="end"
                              className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <PopoverSection
                                title={undefined}
                                items={[
                                  {
                                    icon: Pencil1Icon,
                                    text: "Rename base",
                                    onClick: async () => {
                                      const name = prompt("Enter new base name:", b.name);
                                      if (name && name.trim() !== "" && name !== b.name) {
                                        await onUpdBase(b.id, name);
                                      }
                                    }
                                  }
                                ]}
                              />
                              <PopoverSection
                                title={undefined}
                                items={[
                                  {
                                    icon: TrashIcon,
                                    text: "Delete base",
                                    textColorClass: "text-red-700",
                                    onClick: async () => {
                                      if (!confirm("Are you sure you want to delete this base?")) return;
                                      void onDelBase(b.id);
                                    }
                                  }
                                ]}
                              />
                            </Popover.Content>
                          </Popover.Root>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-xs">
            No bases found. Create a new base to get started.
          </div>
        )
      )}
    </div>
  )
}
