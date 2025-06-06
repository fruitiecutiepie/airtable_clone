'use client';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, Popover } from "radix-ui";
import { ExitIcon, PersonIcon } from '@radix-ui/react-icons';
import { BellIcon, PaintBrushIcon, UsersIcon } from "@heroicons/react/24/outline"
import { PopoverSection, type PopoverSectionProps } from '../../components/ui/PopoverSection';
import React, { useMemo } from 'react';
import { ButtonWithTooltip } from '../../components/ui/ButtonWithTooltip';
import { redirect } from 'next/navigation';

export default function TablePageHeader() {
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
  if (!session) return null;

  const avatarSrc = session.user.image ?? 'https://www.gravatar.com/avatar/3b3be63a4c2a439b013787725dfce802?d=identicon';

  return (
    <header
      className="bg-purple-700"
    >
      <nav
        className="p-3 flex justify-between text-gray-800 text-sm shadow-sm items-center"
      >
        <div
          className="flex items-center gap-4"
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
        </div>
        <div
          className="flex gap-5 px-2"
        >
          <div
            className="flex items-center gap-4"
          >
            <Popover.Root>
              <Popover.Trigger
                asChild
                className={`
                  rounded-full h-6 w-6 inline-flex items-center justify-center outline-1 outline-gray-200
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
                rounded-full h-6 w-6 inline-flex items-center justify-center outline-1 outline-gray-200
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
        </div >
      </nav >
    </header >
  );
}
