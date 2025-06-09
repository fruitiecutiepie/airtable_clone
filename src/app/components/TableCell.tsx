import type { CellContext } from "@tanstack/react-table";
import { useState, useRef, useEffect } from "react";
import type { TableRow, TableRowValue } from "~/lib/schemas";

const TableCell = (props: CellContext<TableRow, TableRowValue>) => {
  const { getValue, row, column, table } = props;

  const initialValue = getValue();
  const dataType = column.columnDef.meta?.dataType;

  const [value, setValue] = useState<TableRowValue>(initialValue);

  const cellToFocus = table.options.meta?.cellToFocus;
  const clearCellToFocus = table.options.meta?.clearCellToFocus;

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (
      cellToFocus?.rowIndex === row.index &&
      cellToFocus?.columnId === column.id
    ) {
      inputRef.current?.focus();
      clearCellToFocus?.();
    }
  }, [cellToFocus, row.index, column.id, clearCellToFocus]);

  const onBlur = async () => {
    if (value === initialValue) return;
    let newValue: TableRowValue | undefined = value;
    switch (dataType) {
      case "numeric":
        if (isNaN(Number(value))) {
          setValue(initialValue);
          return;
        }
        newValue = value === "" ? undefined : Number(value);
        break;
      case "text":
        if (typeof value !== "string") {
          setValue(initialValue);
          return;
        }
        newValue = value.trim() === "" ? undefined : value.trim();
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          setValue(initialValue);
          return;
        }
        newValue = value;
        break;
      case "date":
        if (typeof value !== "string" || isNaN(Date.parse(value))) {
          setValue(initialValue);
          return;
        }
        newValue = value === "" ? undefined : new Date(value).toISOString();
        break;
      default:
        console.warn(`Unsupported data type: ${dataType}`);
        return;
    }

    await table.options.meta?.updateData(
      row.original.rowId,
      column.id,
      newValue
    );
  };

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  if (dataType === "boolean") {
    return (
      <input
        ref={inputRef}
        type="checkbox"
        checked={Boolean(value)}
        onChange={e => setValue(e.target.checked)}
        onBlur={onBlur}
        className="w-full h-full p-0 m-0 border-none outline-none bg-transparent box-border text-xs focus-within:border-blue-500"
      />
    );
  }

  if (dataType === "date") {
    // strip ISO to yyyy-MM-dd
    const dateStr = typeof value === "string" ? value.slice(0, 10) : "";
    return (
      <input
        ref={inputRef}
        type="date"
        value={dateStr}
        onChange={e => setValue(e.target.value)} // keep "yyyy-MM-dd"
        onBlur={onBlur}                          // onBlur will toISOString()
        className="w-full h-full p-0 m-0 border-none outline-none bg-transparent box-border text-xs focus-within:border-blue-500"
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type={dataType === "numeric" ? "number" : "text"}
      value={value != null ? String(value) : ""}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      className="w-full h-full p-0 m-0 border-none outline-none bg-transparent box-border text-xs focus-within:border-blue-500"
    />
  );
};
export default TableCell;
