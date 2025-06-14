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
const NUM_ROWS = 100;

// build the array
const rows = Array.from({ length: NUM_ROWS }).map(() => ({
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  age: faker.number.int({ min: 18, max: 80 }),
  email: faker.internet.email(),
  active: faker.datatype.boolean(),
  joined_at: faker.date.past().toISOString(),
}));

// serialize as a TS module
const fileContents = `
// THIS FILE IS AUTO-GENERATED. DO NOT EDIT BY HAND.
import type { TableRowValue } from "~/lib/schemas";

export const fakeRows: Record<string, TableRowValue>[] = ${JSON.stringify(
  rows,
  null,
  2
)};
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, fileContents, "utf-8");

console.log(`✅ Generated ${NUM_ROWS} rows to ${outPath}`);
