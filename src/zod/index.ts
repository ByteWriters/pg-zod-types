/**
 * Converts column-meta into zod field definition
 * Passes entire DB struct to allow foreign key & enum matching
 */
import z, { ZodType } from 'zod';

import { PgOperation, PgZodTable } from './types';
import { pgColumn2zod, pgColumn2zodString } from './type_map';
import {  PgDb, PgSchema, PgTable } from '../postgres/types';

export const injectPgTableZod = (table: PgTable) => {
  const getTableObjectDef = (operation: PgOperation) => table.columns.reduce(
    (columns, column) => ({ ...columns, [column.name]: pgColumn2zod(column, operation) }),
    {} as Record<PgTable['columns'][number]['name'], ZodType>
  );

  const getTableObjectStringDef = (operation: PgOperation) => JSON.stringify(table.columns.reduce(
    (columns, column) => ({ ...columns, [column.name]: pgColumn2zodString(column, operation) }),
    {} as Record<PgTable['columns'][number]['name'], string>
  ));

  (table as PgZodTable).zod = {
    delete: z.object(getTableObjectDef('delete')),
    insert: z.object(getTableObjectDef('insert')),
    update: z.object(getTableObjectDef('update')),
    select: z.object(getTableObjectDef('select')),
  };

  (table as PgZodTable).zodString = {
    delete: `z.object(${getTableObjectStringDef('delete')})`,
    insert: `z.object(${getTableObjectStringDef('insert')})`,
    update: `z.object(${getTableObjectStringDef('update')})`,
    select: `z.object(${getTableObjectStringDef('select')})`,
  }
}

export const injectPgSchemaZod = (schema: PgSchema) => schema.tables.forEach(injectPgTableZod);

export const injectPgDbZod = (db: PgDb) => {
  if (Array.isArray(db.schemas)) {
    db.schemas.forEach(injectPgSchemaZod);
  } else {
    injectPgSchemaZod(db.schemas);
  }
}
