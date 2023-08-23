import { ZodType } from 'zod';

import { ColumnName, PgColumn, PgSchema, SchemaName, TableName } from '../postgres/types';

export interface PgZodDef {
  delete: ZodType
  insert: ZodType
  select: ZodType
  update: ZodType
}

export interface PgZodStringDef {
  delete: string
  insert: string
  select: string
  update: string
}

export type PgOperation = keyof PgZodDef;

export interface PgZodTable {
  name: TableName
  columns: PgColumn[]
  zod: PgZodDef
  zodString: PgZodStringDef
}

export interface PgZodSchema extends PgSchema {
  tables: PgZodTable[]
}

/** Top-level export */
export interface PgZodDb {
  name: string
  schemas: PgZodSchema[]
  getColumn: (schema_name: SchemaName, table_name: TableName, column_name: ColumnName) => PgColumn
  getTable: (schema_name: SchemaName, table_name: TableName) => PgZodTable
  getSchema: (schema_name: SchemaName) => PgSchema
  getSchemaColumns: (schema_name: SchemaName) => PgColumn[]
  getSchemaPkeys: (schema_name: SchemaName) => PgColumn[]
}

