import { Client, ClientConfig } from 'pg';

import * as query from './queries';
import { PgTypeResult, buildCustomType, filterBy, filterOptions, get, getOrPush, PgSchemaOptions } from './util';
import { ColumnName, EnumName, PgColumn, PgDb, PgSchema, PgTable, PgTypes, SchemaName, TableName } from './types';

// PG Query return-types
interface PgColumnResult {
  schema_name: SchemaName
  table_name: TableName
  name: ColumnName
  column_default: string | null
  is_nullable: 'YES' | 'NO'
  pg_type: string
  data_type: string
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

interface PgEnumResult {
  pg_type: EnumName
  schema_name: SchemaName
  values: string
}

// Initializers for on-the-fly schema & table creation
const createSchema = (name: string): PgSchema => ({
  name, enums: [], types: [], tables: []
});
const createTable = (name: string): PgTable => ({
  name, columns: []
});

/**
 * export describeDB
 * fetches PG internal tables & converts to describing object
 * - schemas
 *   - enums
 *   - types (user-defined composite types for function output)
 *   - tables
 *     - columns
 *       - type ('basic', 'enum' or 'foreign' with according info)
 */
export const getPgDB = async (
  clientConfig: ClientConfig,
  options: PgSchemaOptions[] = [{ name: 'public', skipTables: [] }]
) => {
  const client = new Client(clientConfig);
  await client.connect();

  // Collect everything in one go for faster querying & have all info in advance (fkey-relations)
  const { rows: columnRows } = await client.query<PgColumnResult>(query.columns);
  const { rows: enumRows } = await client.query<PgEnumResult>(query.enums);
  const { rows: keyRows } = await client.query<PgKeyResult>(query.keys);
  const { rows: typeRows } = await client.query<PgTypeResult>(query.types);
  const { rows: functionRows } = await client.query(query.functions);

  await client.end();

  // Declare final output
  const schemas: PgSchema[] = [];

  // Exported DB-node getters
  const getSchema: PgDb['getSchema'] = schema_name => get(schemas, schema_name);

  const getTable: PgDb['getTable'] = (
    schema_name, table_name
  ) => get(get(schemas, schema_name)?.tables, table_name);

  const getColumn: PgDb['getColumn'] = (
    schema_name, table_name, column_name
  ) => get(get(get(schemas, schema_name)?.tables, table_name).columns, column_name);

  const getSchemaColumns = (schema_name: SchemaName) => getSchema(schema_name).tables.reduce(
    (schemaColumns, { columns }) => schemaColumns.concat(columns),
    [] as PgColumn[]
  );

  const getSchemaPkeys = (schema_name: SchemaName) => getSchemaColumns(schema_name).filter(
    ({ pkey }) => pkey === true
  );

  // Create schema column-by-column (parent table/schema added on-the-fly)
  for (const { column_default, is_nullable, pg_type: _pg_type, data_type, ...pgColumn } of columnRows) {
    const { schema_name, table_name } = pgColumn;

    const is_array = data_type === 'ARRAY';
    const pg_type = is_array ? _pg_type.replace('_', '') : _pg_type;

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
      array: is_array,
      pkey: false,
      type: {
        kind: 'basic',
        has_default: !!column_default,
        nullable: is_nullable === 'YES',
        pg_type,
      },
    }

    table.columns.push(column);
  };

  // Post-processing to inject references created during above loop
  for (const schema of schemas) {
    schema.enums = enumRows.filter(filterBy('schema_name', schema.name)).map(
      ({ pg_type, values }) => ({ pg_type, values: values.split(';') as [ string, ...string[] ] })
    );

    schema.types = typeRows.filter(
      filterBy('schema_name', schema.name)
    ).map(buildCustomType(schema));

    // Find enum-type columns & update them according to schema.enums
    for (const _enum of schema.enums) {
      const enumColumns = getSchemaColumns(schema.name).filter(
        ({ type }) => type.pg_type === _enum.pg_type
      );

      for (const enumColumn of enumColumns) {
        enumColumn.type = {
          ...(enumColumn.type as PgTypes['basic']),
          kind: 'enum',
          values: _enum.values
        }
      }
    }

    // Find primary/foreign keys & inject into relevant columns
    for (const {
      schema_name, table_name, column_name,
      constraint_type,
      f_schema_name, f_table_name, f_column_name
    } of keyRows.filter(filterBy('schema_name', schema.name))) {
      const keyColumn = getColumn(schema_name, table_name, column_name);

      if (constraint_type === 'PRIMARY KEY' && keyColumn) {
        keyColumn.pkey = true;
      }

      if (constraint_type === 'FOREIGN KEY' && keyColumn) {
        keyColumn.type = {
          ...(keyColumn.type as PgTypes['basic']),
          kind: 'foreign',
          column: getColumn(f_schema_name, f_table_name, f_column_name)
        }
      }
    }
  }

  return {
    name: clientConfig.database || 'postgres',
    schemas: filterOptions(schemas, options),
    getColumn,
    getTable,
    getSchema,
    getSchemaColumns,
    getSchemaPkeys,
  } as PgDb;
}
