import { Client, ClientConfig } from 'pg';

import * as query from './queries';
import { PgColumn, PgSchema, PgTable } from './types';

interface PostgresOptions {
  schemas: string[]
}

// PG Query return-types
type SchemaName = string & { _type?: 'Schema' }
type TableName = string & { _type?: 'Table' }
type EnumName = string & { _type?: 'Enum' }
type ColumnName = string & { _type?: 'Column' }

interface PgColumnResult {
  schema_name: SchemaName
  table_name: TableName
  name: ColumnName
  column_default: string | null
  is_nullable: 'YES' | 'NO'
  data_type: string
  pg_type: string
}

interface PgEnumResult {
  name: EnumName
  schema_name: SchemaName
  values: string
}

interface PgKeyResult {
  schema_name: SchemaName
  table_name: TableName
  column_name: ColumnName
  constraint_type: 'PRIMARY KEY' | 'FOREIGN KEY'
  f_schema_name: SchemaName
  f_table_name: TableName
  f_column_name: ColumnName
}

// Returns array-element based on nested property value
const get = <T = any>(
  array: T[], value: any, field: keyof T = 'name' as keyof T
) => Array.isArray(array) ? array.find(s => s[field] === value) : undefined;

// Returns array-element based on nested property value, or pushes supplied item
const getOrPush = <T = any>(
  array: T[], item: any, value: any, field: keyof T = 'name' as keyof T
) => {
  const idx = array.findIndex(s => s[field] === value);
  if (idx >= 0) return array[idx];

  array.push(item);
  return array.at(-1);
}

// Initializers for on-the-fly schema & table creation
const createSchema = (name: string): PgSchema => ({
  name, enums: [], tables: []
});
const createTable = (name: string): PgTable => ({
  name, columns: []
});

/**
 * export describeDB
 * fetches PG internal tables & converts to describing object
 * - schemas
 *   - enums
 *   - tables
 *     - columns
 *       - enum? -> enum
 *       - fkey? -> column
 */
export const describeDB = async (
  clientConfig: ClientConfig,
  options: PostgresOptions
) => {
  const client = new Client(clientConfig);
  await client.connect();

  // Collect everything in one go for faster querying & have all info in advance (fkey-relations)
  const { rows: columnRows } = await client.query<PgColumnResult>(query.columns);
  const { rows: enumRows } = await client.query<PgEnumResult>(query.enums);
  const { rows: keyRows } = await client.query<PgKeyResult>(query.keys);

  await client.end();

  // Declare final output
  const schemas: PgSchema[] = [];

  // Exported DB-node getters
  const getSchema = (schema_name: SchemaName) => get(schemas, schema_name);
  const getTable = (
    schema_name: SchemaName, table_name: TableName
  ) => get(get(schemas, schema_name).tables, table_name);
  const getColumn = (
    schema_name: SchemaName, table_name: TableName, column_name: ColumnName
  ) => get(get(get(schemas, schema_name).tables, table_name).columns, column_name);

  const getSchemaColumns = (schema_name: SchemaName) => getSchema(schema_name).tables.reduce(
    (schemaColumns, { columns }) => schemaColumns.concat(columns),
    [] as PgColumn[]
  );

  const getSchemaPkeys = (schema_name: SchemaName) => getSchemaColumns(schema_name).filter(
    ({ key_type }) => key_type === 'primary'
  );

  // Create schema column-by-column (parent table/schema added on-the-fly)
  for (const { column_default, is_nullable, ...pgColumn } of columnRows) {
    const { schema_name, table_name } = pgColumn;

    const schema: PgSchema = getOrPush(
      schemas,
      createSchema(schema_name),
      schema_name
    );

    const table: PgTable = getOrPush(
      schema.tables,
      createTable(table_name),
      table_name
    );

    const column: PgColumn = {
      ...pgColumn,
      key_type: null,
      nullable_read: is_nullable === 'YES',
      nullable_write: (is_nullable === 'YES' || !!column_default),
      enum: null,
      fkey: null,
    }

    table.columns.push(column);
  };

  // Post-processing to inject references created during above loop
  for (const schema of schemas) {
    // Find enums & inject into schema/relevant columns
    schema.enums = enumRows.filter(
      ({ schema_name }) => schema_name === schema.name
    ).map(
      ({ name, values }) => ({ name, values: values.split(';') })
    );

    for (const _enum of schema.enums) {
      const enumColumns = getSchemaColumns(schema.name).filter(
        ({ pg_type }) => pg_type === _enum.name
      );

      for (const enumColumn of enumColumns) {
        enumColumn.enum = _enum;
        enumColumn.pg_type = 'enum';
      }
    }

    // Find primary/foreign keys & inject into relevant columns
    for (const {
      schema_name, table_name, column_name,
      constraint_type,
      f_schema_name, f_table_name, f_column_name
    } of keyRows.filter(
      ({ schema_name }) => schema_name === schema.name
    )) {
      const keyColumn = getColumn(schema_name, table_name, column_name);

      if (constraint_type === 'PRIMARY KEY' && keyColumn) {
        keyColumn.key_type = 'primary';
      }

      if (constraint_type === 'FOREIGN KEY' && keyColumn) {
        keyColumn.key_type = 'foreign';
        const fKeyColumn = getColumn(f_schema_name, f_table_name, f_column_name);

        if (fKeyColumn) {
          keyColumn.fkey = fKeyColumn;
        }
      }
    }
  }

  return {
    schemas,
    getColumn,
    getTable,
    getSchema,
    getSchemaColumns,
    getSchemaPkeys,
  }
}
