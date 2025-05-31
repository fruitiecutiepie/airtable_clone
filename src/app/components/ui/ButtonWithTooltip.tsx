import React from "react";
import { Tooltip } from "radix-ui";

export interface ButtonWithTooltipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel: string;
  tooltip: React.ReactNode;
  children: React.ReactNode;
}

export const ButtonWithTooltip = React.forwardRef<
  HTMLButtonElement,
  ButtonWithTooltipProps
>(({ ariaLabel, tooltip, children, className, ...buttonProps }, ref) => (
  <Tooltip.Provider>
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          ref={ref}
          aria-label={ariaLabel}
          className={[
            "rounded-full h-6 w-6 inline-flex items-center justify-center",
            "hover:bg-gray-200 cursor-pointer p-1",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...buttonProps}
        >
          {children}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content
        side="bottom"
        sideOffset={5}
        className="bg-gray-800 text-white text-[11px] px-2 py-1 rounded shadow-lg"
      >
        {tooltip}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
));

ButtonWithTooltip.displayName = "ButtonWithTooltip";
