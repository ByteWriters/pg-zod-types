import { ColumnName, PgBaseType, PgColumn, PgSchema, SchemaName, TableName, TypeName } from './types';

export interface PgSchemaOptions {
  name: SchemaName
  skipTables?: TableName[]
}
export type PgDbOptions = PgSchemaOptions[];

/** Small helpers for lookups */

// Returns array-element based on nested property value
export const get = <T = any>(
  array: T[], value: any, field: keyof T = 'name' as keyof T
) => Array.isArray(array) ? array.find(s => s[field] === value) : undefined;

// Returns array-element based on nested property value, or pushes supplied item
export const getOrPush = <T = any>(
  array: T[], item: any, value: any, field: keyof T = 'name' as keyof T
) => {
  const idx = array.findIndex(s => s[field] === value);
  if (idx >= 0) return array[idx];

  array.push(item);
  return array.at(-1);
}

// Composable filter-by function (supply key/value to return [].filter()-argument)
export const filterBy = <T = any>(
  by: keyof T, value: T[keyof T]
) => (input: T) => input[by] === value;

/** Query-result for user-defined composite types */
export interface PgTypeResult {
  pg_type: TypeName
  schema_name: SchemaName
  fields: { index: number, name: ColumnName, pg_type: string, data_type: string, is_nullable: 'YES' | 'NO' }[]
}

/** User-defined composite types builder (queried PgTypeResult -> PgSchema['types']) */
export const buildCustomType = (schema: PgSchema) => (
  { pg_type, fields }: PgTypeResult
) => {
  const typeFields = fields.sort(
    (a, b) => a.index > b.index ? 1 : -1
  ).map(({ name, is_nullable, pg_type: _pg_type, data_type, ...fields }) => {
    const is_array = data_type === 'ARRAY';
    const pg_type = is_array ? _pg_type.replace('_', '') : _pg_type;

    const enumType = schema.enums.find(e => e.pg_type === pg_type);
    const nullable = is_nullable === 'YES';

    const baseFieldType: PgBaseType<{}> = {
      has_default: false,
      pg_type,
      nullable,
    };

    if (enumType) return {
      name, type: { kind: 'enum', values: enumType.values, ...baseFieldType }
    } as Omit<PgColumn, 'pkey'>;

    return {
      name, type: { kind: 'basic', ...baseFieldType }
    } as Omit<PgColumn, 'pkey'>;;
  });

  return {
    pg_type,
    fields: typeFields
  };
};

/** Apply options (schema -> whitelist, skipTables -> blacklist) */
const filterTables = (schema: PgSchema, skipTables: TableName[] = []) => {
  const filteredTables = schema.tables.filter(t => !skipTables.includes(t.name));
  schema.tables = filteredTables;
  return schema;
}

export const filterOptions = (schemas: PgSchema[], options: PgSchemaOptions[]) => {
  return options.map(({ name, skipTables }) => filterTables(
    schemas.find(s => s.name === name), skipTables
  ));
}
