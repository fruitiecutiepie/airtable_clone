import { addRow } from './addRow';
import { addRows } from './addRows';
import { addColumn } from './addColumn';
import { addTable } from './addTable';
import { delColumn } from './delColumn';
import { delRow } from './delRow';
import { delTable } from './delTable';
import { getColumns } from './getColumns';
import { getRows } from './getRows';
import { getTables } from './getTables';
import { searchRows } from './searchRows';
import { updColumn } from './updColumn';
import { updRow } from './updRow';
import { updTable } from './updTable';
import { createTRPCRouter } from '../../trpc';

export const tableRouter = createTRPCRouter({
  addTable,
  getColumns,
  addColumn,
  addRow,
  addRows,
  searchRows,
  getRows,
  updRow,
  delRow,
  updColumn,
  delColumn,
  updTable,
  delTable,
  getTables
});