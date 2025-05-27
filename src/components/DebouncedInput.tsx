import { useState, useEffect, useRef } from "react";
import { useDebounce } from "~/app/hooks/useDebounce";

type DebouncedInputProps<T> =
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
    value: T;
    onDebouncedChange: (value: T) => void;
    /**
     * Turn the string from the <input> into your type T.
     * Default is `raw => raw as unknown as T` (i.e. string).
     */
    parse?: (raw: string) => T;
    /**
     * Turn your type T into a string for the <input> value.
     * Default is `v => String(v)`
     */
    format?: (value: T) => string;
    delay?: number;
  };

export function DebouncedInput<T = string>({
  value,
  onDebouncedChange,
  format = (v) => String(v),
  parse = (raw) => raw as unknown as T,
  delay = 300,
  ...props
}: DebouncedInputProps<T>) {
  const [draft, setDraft] = useState(format(value));
  const debounced = useDebounce(draft, delay);

  // 🌟 prevent the initial mount from firing
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onDebouncedChange(parse(debounced));
  }, [debounced, onDebouncedChange, parse]);

  // if the external `value` changes (e.g. reset), update our draft
  useEffect(() => {
    setDraft(format(value));
  }, [value, format]);

  return (
    <input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.currentTarget.value)}
    />
  );
}