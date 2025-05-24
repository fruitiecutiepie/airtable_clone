import { addColumn } from './addColumn';
import { addTable } from './addTable';
import { delColumn } from './delColumn';
import { delRow } from './delRow';
import { delTable } from './delTable';
import { getColumns } from './getColumns';
import { getRows } from './getRows';
import { getTables } from './getTables';
import { updColumn } from './updColumn';
import { updRow } from './updRow';
import { updTable } from './updTable';
import { createTRPCRouter } from '../../trpc';
import { addRows } from './addRows';

export const tableRouter = createTRPCRouter({
  addTable,
  getColumns,
  addColumn,
  addRows,
  getRows,
  updRow,
  delRow,
  updColumn,
  delColumn,
  updTable,
  delTable,
  getTables
});