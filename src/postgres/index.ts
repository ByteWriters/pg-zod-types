import { Client, ClientConfig } from 'pg';

import * as query from './queries';
import { ColumnName, PgColumn, PgSchema, PgSchemaOptions, PgTable, PgTypes, SchemaName, TableName } from './types';
import { buildCustomType, buildFunction, filterBy, filterOptions, get, getOrPush } from './util';

// Initializers for on-the-fly schema & table creation
const createSchema = (name: string): PgSchema => ({
  name, enums: [], functions: [], types: [], tables: []
});
const createTable = (name: string): PgTable => ({
  name, columns: []
});

/**
 * export describeDB
 * fetches PG internal tables & converts to describing object
 * - schemas
 *   - enums
 *   - functions (user-defined, non-trigger functions) with arg- and return-types
 *   - types (user-defined composite types for function output)
 *   - tables
 *     - columns
 *       - type ('basic', 'enum' or 'foreign' with according info)
 */
export const getPgDB = async (
  clientConfig: ClientConfig,
  options: PgSchemaOptions[] = [{ name: 'public' }]
) => {
  const client = new Client(clientConfig);
  await client.connect();

  // Collect everything in one go for faster querying & have all info in advance (fkey-relations)
  const { rows: columnRows } = await client.query<query.PgColumnResult>(query.columns);
  const { rows: enumRows } = await client.query<query.PgEnumResult>(query.enums);
  const { rows: keyRows } = await client.query<query.PgKeyResult>(query.keys);
  const { rows: typeRows } = await client.query<query.PgTypeResult>(query.types);
  const { rows: functionRows } = await client.query<query.PgFunctionResult>(query.functions);

  await client.end();

  // Declare final output
  const schemas: PgSchema[] = [];

  // DB-node getters
  const getSchema = (schema_name: SchemaName) => get(schemas, schema_name);

  const getTable = (
    schema_name: SchemaName, table_name: TableName
  ) => get(get(schemas, schema_name)?.tables, table_name);

  const getColumn = (
    schema_name: SchemaName, table_name: TableName, column_name: ColumnName
  ) => get(getTable(schema_name, table_name)?.columns, column_name);

  const getSchemaColumns = (schema_name: SchemaName) => getSchema(schema_name).tables.reduce(
    (schemaColumns, { columns }) => schemaColumns.concat(columns),
    [] as PgColumn[]
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
      pkey: false,
      type: {
        array: is_array,
        has_default: !!column_default,
        kind: 'basic',
        nullable: is_nullable === 'YES',
        pg_type
      },
    }

    table.columns.push(column);
  };

  // Post-processing to inject references created during above loop
  for (const schema of schemas) {
    schema.enums = enumRows.filter(filterBy('schema_name', schema.name)).map(
      ({ pg_type, values }) => ({ name: pg_type, pg_type, values: values.split(';') as [ string, ...string[] ] })
    );

    schema.types = typeRows.filter(
      filterBy('schema_name', schema.name)
    ).map(buildCustomType(schema));

    schema.functions = functionRows.filter(
      filterBy('schema_name', schema.name)
    ).map(buildFunction(schema));

    // Find enum-type columns & update them according to schema.enums
    for (const _enum of schema.enums) {
      const enumColumns = getSchemaColumns(schema.name).filter(
        ({ type }) => type.pg_type === _enum.pg_type
      );

      for (const enumColumn of enumColumns) {
        const { type } = enumColumn;

        enumColumn.type = {
          ...type,
          kind: 'enum',
          values: _enum.values
        }
      }
    }

    // Find custom-type columns & update them according to schema.types
    for (const _type of schema.types) {
      const typeColumns = getSchemaColumns(schema.name).filter(
        ({ type }) => type.pg_type === _type.pg_type
      );

      for (const typeColumn of typeColumns) {
        const { type } = typeColumn;

        typeColumn.type = {
          ...type,
          kind: 'custom',
          fields: _type.fields
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

  return filterOptions(schemas, options);
}
