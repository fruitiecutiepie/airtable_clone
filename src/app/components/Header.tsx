'use client';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, Popover } from "radix-ui";
import { ChatBubbleIcon, EnvelopeClosedIcon, ExitIcon, FileIcon, GlobeIcon, HamburgerMenuIcon, LaptopIcon, PersonIcon, PlayIcon, QuestionMarkCircledIcon, StarIcon } from '@radix-ui/react-icons';
import { BellIcon, CodeBracketIcon, GiftIcon, PaintBrushIcon, UsersIcon } from "@heroicons/react/24/outline"
import { PopoverSection, type PopoverSectionProps } from './ui/PopoverSection';
import React from 'react';
import { ButtonWithTooltip } from './ui/ButtonWithTooltip';

export default function Header() {
  const { data: session } = useSession();
  if (!session) return null;

  const avatarSrc = session.user.image ?? 'https://www.gravatar.com/avatar/3b3be63a4c2a439b013787725dfce802?d=identicon';

  const helpSections: PopoverSectionProps[] = [
    {
      title: "Support",
      items: [
        {
          icon: FileIcon,
          href: "#",
          text: "Help center"
        },
        {
          icon: GlobeIcon,
          href: "#",
          text: "Ask the community"
        },
        {
          icon: ChatBubbleIcon,
          href: "#",
          text: "Message support"
        },
        {
          icon: EnvelopeClosedIcon,
          href: "#",
          text: "Contact sales"
        }
      ]
    },
    {
      title: "Education",
      items: [
        {
          icon: LaptopIcon,
          href: "#",
          text: "Keyboard shortcuts"
        },
        {
          icon: PlayIcon,
          href: "#",
          text: "Webinars"
        },
        {
          icon: GiftIcon,
          href: "#",
          text: "What’s new"
        },
        {
          icon: CodeBracketIcon,
          href: "#",
          text: "API documentation"
        }
      ]
    },
    {
      title: "Upgrade",
      items: [
        {
          icon: StarIcon,
          href: "#",
          text: "Plans and pricing"
        }
      ]
    },
  ];

  const accountSections: PopoverSectionProps[] = [
    {
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
  ];

  return (
    <header>
      <nav
        className="p-3 flex justify-between text-gray-800 text-sm bg-white shadow-sm items-center"
      >
        <div
          className="flex items-center gap-4"
        >
          <ButtonWithTooltip
            ariaLabel="Sidebar"
            tooltip="Expand sidebar"
          >
            <HamburgerMenuIcon />
          </ButtonWithTooltip>
          <Link
            className={``}
            href="/"
          >
            <Image
              src="/Airtable-Logo-Color.png"
              alt="Airtable Logo"
              width={100}
              height={40}
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
                  rounded-full h-6 w-6 inline-flex items-center justify-center
                  hover:bg-gray-200 cursor-pointer
                `}
              >
                <button
                  className={`
                    inline-flex items-center justify-center align-middle rounded-full
                    hover:bg-gray-200
                  `}
                  aria-label="Help"
                >
                  <QuestionMarkCircledIcon />
                </button>
              </Popover.Trigger>
              <Popover.Content
                sideOffset={5}
                align="end"
                className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs"
              >
                {helpSections.map((section, index) => (
                  <PopoverSection
                    key={index}
                    title={section.title}
                    items={section.items}
                  />
                ))}
              </Popover.Content>
            </Popover.Root>
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
              className="bg-white shadow-xl px-3 py-4 rounded-lg w-64 border border-gray-300 text-xs"
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
                />
              ))}
              <hr className="m-2 border-gray-200" />
              <PopoverSection
                key={'logout'}
                title={undefined}
                items={[
                  {
                    icon: ExitIcon,
                    onClick: () => void signOut(),
                    text: "Sign out"
                  }
                ]}
              />
            </Popover.Content>
          </Popover.Root>
        </div >
      </nav >
    </header >
  );
}
