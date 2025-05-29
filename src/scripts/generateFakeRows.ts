import { faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outPath = path.join(__dirname, "../data/fakeRows.ts");

// if the file already exists, skip generation
if (fs.existsSync(outPath)) {
  console.log(`⏭️  Skipping generation, ${outPath} already exists`);
  process.exit(0);
}

// how many rows to generate
const NUM_ROWS = 100_000;

// build the array
const rows = Array.from({ length: NUM_ROWS }).map(() => ({
  firstName: faker.person.firstName(),
  age: faker.number.int({ min: 18, max: 80 }),
  email: faker.internet.email(),
}));

// serialize as a TS module
const fileContents = `
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT BY HAND.
import type { TableRowValue } from "~/schemas";

export const fakeRows: Record<string, TableRowValue>[] = ${JSON.stringify(
  rows,
  null,
  2
)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, fileContents, "utf-8");

console.log(`✅ Generated ${NUM_ROWS} rows to ${outPath}`);
