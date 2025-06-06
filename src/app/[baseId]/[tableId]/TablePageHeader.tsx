'use client';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, Popover, Separator } from "radix-ui";
import { CaretDownIcon, CountdownTimerIcon, ExitIcon, PersonIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { BellIcon, PaintBrushIcon, TrashIcon, UserGroupIcon, UsersIcon } from "@heroicons/react/24/outline"
import { PopoverSection, type PopoverSectionProps } from '../../components/ui/PopoverSection';
import React, { useMemo } from 'react'
import { ButtonWithTooltip } from '../../components/ui/ButtonWithTooltip';
import { redirect } from 'next/navigation';
import { api } from '~/trpc/react';

export default function TablePageHeader({
  baseId
}: {
  baseId: number;
}) {
  const accountSections: PopoverSectionProps[] = useMemo(() => [
    {
      search: false,
      title: undefined,
      items: [
        {
          icon: PersonIcon,
          href: "/#",
          text: "Account",
        },
        {
          icon: UsersIcon,
          href: "/#",
          text: "Manage groups",
        },
        {
          icon: BellIcon,
          href: "/#",
          text: "Notification preferences",
        },
        {
          icon: PaintBrushIcon,
          href: "/#",
          text: "Appearance",
        }
      ]
    },
  ], []);

  const { data: session } = useSession();
  const { data: base, isLoading, error, refetch } = api.base.getBase.useQuery({
    baseId,
  }, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
  const updBase = api.base.updBase.useMutation({
    onSuccess: async () => {
      await refetch();
    },
    onError: (error, variables, context) => {
      console.error(`Error updating base: ${error.message}`, variables, context);
    },
  });
  const delBase = api.base.delBase.useMutation({
    onSuccess: async () => {
      redirect('/');
    },
    onError: (error, variables, context) => {
      console.error(`Error deleting base: ${error.message}`, variables, context);
    },
  });

  if (!session) return null;
  const avatarSrc = session.user.image ?? 'https://www.gravatar.com/avatar/3b3be63a4c2a439b013787725dfce802?d=identicon';

  if (isLoading) {
    return (
      <header className="bg-purple-700">
        <nav className="p-3 flex justify-between text-gray-800 text-sm shadow-sm items-center">
          <div className="flex items-center gap-4 px-2">
            <Image
              src="/Airtable-Mark-White.png"
              alt="Airtable Logo"
              width={24}
              height={24}
              priority
            />
            <span className="text-white">Loading base...</span>
          </div>
        </nav>
      </header>
    );
  }
  if (error) {
    console.error("Error fetching base:", error);
    return (
      <header className="bg-purple-700">
        <nav className="p-3 flex justify-between text-gray-800 text-sm shadow-sm items-center">
          <div className="flex items-center gap-4 px-2">
            <Image
              src="/Airtable-Mark-White.png"
              alt="Airtable Logo"
              width={24}
              height={24}
              priority
            />
            <span className="text-white">Error loading base</span>
          </div>
        </nav>
      </header>
    );
  }
  if (!base) {
    return (
      <header className="bg-purple-700">
        <nav className="p-3 flex justify-between text-gray-800 text-sm shadow-sm items-center">
          <div className="flex items-center gap-4 px-2">
            <Image
              src="/Airtable-Mark-White.png"
              alt="Airtable Logo"
              width={24}
              height={24}
              priority
            />
            <span className="text-white">Base not found</span>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header
      className="bg-purple-700"
    >
      <nav
        className="p-4 flex justify-between text-gray-800 text-sm shadow-sm items-center"
      >
        <div
          className="flex items-center gap-4 px-2"
        >
          <Link
            className={``}
            href="/"
          >
            <Image
              src="/Airtable-Mark-White.png"
              alt="Airtable Logo"
              width={24}
              height={24}
              priority
            />
          </Link>
          <Popover.Root>
            <Popover.Trigger
              asChild
              className={`
                h-6 w-6 inline-flex items-center justify-center cursor-pointer
              `}
            >
              <button
                className={`w-fit gap-1 text-white rounded-b-none rounded-t-sm h-8`}
              >
                <span className="font-semibold text-lg">
                  {base.name}
                </span>
                <CaretDownIcon
                  className={`w-6 h-6 shrink-0 text-white opacity-70`}
                />
              </button>
            </Popover.Trigger>
            <Popover.Content
              sideOffset={5}
              align="start"
              className="bg-white shadow-xl px-3 py-3 rounded-lg w-72 border border-gray-300 text-sm text-gray-700 z-20"
            >
              <div className="">
                <label
                  htmlFor="rename-base"
                  className="block text-xs font-medium text-gray-700 p-1"
                >
                  Rename base
                </label>
                <div className="flex gap-2">
                  <input
                    id="rename-base"
                    type="text"
                    defaultValue={base.name}
                    className="flex-1 border border-gray-300 rounded px-2 py-1 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        e.currentTarget.blur()
                      }
                    }}
                    onBlur={(e) => {
                      const newName = e.currentTarget.value.trim()
                      if (newName && newName !== base.name) {
                        updBase.mutate({
                          userId: session.user.id,
                          base: {
                            ...base,
                            name: newName,
                            updatedAt: new Date().toISOString(),
                          },
                        })
                      }
                    }}
                  />
                  <button
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Delete base"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this base?')) {
                        delBase.mutate(
                          {
                            userId: session.user.id,
                            baseId: base.id,
                          }
                        )
                      }
                    }}
                  >
                    <TrashIcon className="w-5 h-5 text-red-600" />
                  </button>
                </div>
              </div>
            </Popover.Content>
          </Popover.Root>
          <div
            className="flex items-center gap-2 text-gray-200"
          >
            <div
              className="font-medium bg-purple-900 rounded-full px-3 py-1 cursor-pointer"
            >
              <p>
                Data
              </p>
            </div>
            <div
              className="font-medium hover:bg-purple-800 rounded-full px-3 py-1 cursor-pointer"
            >
              <p>
                Automations
              </p>
            </div>
            <div
              className="font-medium hover:bg-purple-800 rounded-full px-3 py-1 cursor-pointer"
            >
              <p>
                Interfaces
              </p>
            </div>
            <div className="mx-2 bg-gray-200 opacity-50 w-px h-5 z-20" />
            <div
              className="font-medium hover:bg-purple-800 rounded-full px-3 py-1 cursor-pointer"
            >
              <p>
                Forms
              </p>
            </div>
          </div>
        </div>
        <div
          className="flex gap-5 px-2"
        >
          <div
            className="flex items-center justify-center gap-2"
          >
            <div
              className="
                flex items-center gap-2 hover:bg-purple-800 rounded-2xl p-2
                text-gray-200 cursor-pointer
              "
            >
              <CountdownTimerIcon className="h-4 w-4" />
            </div>
            <div
              className="
                flex items-center gap-1 hover:bg-purple-800 rounded-2xl py-1 px-3
                text-gray-200 cursor-pointer
              "
            >
              <QuestionMarkCircledIcon className="h-4 w-4" />
              <p
                className="inline-flex items-center gap-1"
              >
                Help
              </p>
            </div>
          </div>
          <div
            className="
                flex items-center gap-1 bg-white hover:bg-gray-200 rounded-2xl px-3 py-1
                text-gray-500 cursor-pointer
              "
          >
            <UserGroupIcon className="h-5 w-5" />
            <p
              className="inline-flex items-center gap-1 text-gray-500"
            >
              Share
            </p>
          </div>
          <div
            className="flex items-center gap-4"
          >
            <Popover.Root>
              <Popover.Trigger
                asChild
                className={`
                  rounded-full h-7 w-7 inline-flex items-center justify-center outline-1 outline-gray-200
                  bg-white shadow-sm hover:bg-gray-200 focus:shadow-md cursor-pointer
                `}
              >
                <ButtonWithTooltip
                  ariaLabel="Notifications"
                  tooltip="Notifications"
                >
                  <BellIcon />
                </ButtonWithTooltip>
              </Popover.Trigger>
              <Popover.Content
                sideOffset={5}
                align="end"
                className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs"
              >
                <p className="mx-2">
                  No unread notifications
                </p>
              </Popover.Content>
            </Popover.Root>
          </div>
          <Popover.Root>
            <Popover.Trigger
              asChild
              className={`
                rounded-full h-7 w-7 inline-flex items-center justify-center outline-1 outline-gray-200
                bg-white shadow-sm hover:bg-gray-200 focus:shadow-md cursor-pointer
              `}
            >
              <Avatar.Root
                className={`
                  inline-flex items-center justify-center align-middle overflow-hidden rounded-full
                `}
              >
                <Avatar.Image
                  src={avatarSrc}
                  alt={session.user.name ?? 'User Avatar'}
                  className="w-full h-full object-cover rounded-full"
                />
                <Avatar.Fallback
                  delayMs={600}
                  className="w-full h-full flex items-center justify-center bg-orange-700 text-white text-sm font-medium rounded-full"
                >
                  {session.user.name?.charAt(0) ?? 'U'}
                </Avatar.Fallback>
              </Avatar.Root>
            </Popover.Trigger>
            <Popover.Content
              sideOffset={5}
              align="end"
              className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs z-20"
            >
              <div
                className="gap-1 flex flex-col p-2"
              >
                <p className="font-semibold">
                  {session.user.name}
                </p>
                <p>
                  {session.user.email}
                </p>
              </div>
              <hr className="m-2 border-gray-200" />
              {accountSections.map((section, index) => (
                <PopoverSection
                  key={index}
                  title={section.title}
                  items={section.items}
                  search={section.search}
                />
              ))}
              <hr className="m-2 border-gray-200" />
              <PopoverSection
                key={'logout'}
                title={undefined}
                items={[
                  {
                    icon: ExitIcon,
                    onClick: async () => {
                      await signOut();
                      redirect('/');
                    },
                    text: "Sign out"
                  }
                ]}
                search={false}
              />
            </Popover.Content>
          </Popover.Root>
        </div>
      </nav>
    </header>
  );
}
