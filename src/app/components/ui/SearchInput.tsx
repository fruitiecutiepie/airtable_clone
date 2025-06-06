import React from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export interface SearchInputProps {
  searchPlaceholder?: string,
  value?: string,
  onChange?: (value: string) => Promise<void> | void,
  size: "xs" | "sm" | "md" | "lg",
  className?: string
}

export function SearchInput({
  searchPlaceholder = "Search...",
  value = "",
  onChange = () => { return; },
  size = "md",
  className = ""
}: SearchInputProps) {
  return (
    <div
      className={`
        relative flex items-center gap-3
        ${size === "xs"
          ? "h-6 text-xs"
          : size === "sm"
            ? "h-8 text-sm"
            : size === "md"
              ? "h-10 text-base"
              : "h-12 text-lg"
        } ${size === "xs" ? "px-2" : "px-3"}
        ${className}
      `}
    >
      <div className="relative flex-1">
        <MagnifyingGlassIcon className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-6 pr-4 py-2 border-0 focus:outline-none focus:ring-0 placeholder-gray-500"
        />
      </div>
    </div>
  );
}