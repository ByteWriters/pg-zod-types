import { ColumnName, EnumName, FunctionName, SchemaName, TableName, TypeName } from './types';


export interface PgColumnResult {
  schema_name: SchemaName
  table_name: TableName
  name: ColumnName
  column_default: string | null
  is_nullable: 'YES' | 'NO'
  pg_type: string
  data_type: string
}

export const columns = `
SELECT table_schema schema_name, table_name, column_name name, column_default, is_nullable, udt_name as pg_type, data_type
  FROM information_schema.columns
  WHERE table_schema != 'pg_catalog' AND table_schema != 'information_schema'
  ORDER BY table_name, ordinal_position
`;


export interface PgEnumResult {
  name: EnumName
  pg_type: string
  schema_name: SchemaName
  values: string
}

export const enums = `
SELECT t.typname as "name", t.typname as "pg_type", n.nspname schema_name, string_agg(e.enumlabel, ';') AS values
  FROM pg_type t
  JOIN pg_enum e on t.oid = e.enumtypid
  JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  GROUP BY t.typname, n.nspname
`;


export interface PgKeyResult {
  schema_name: SchemaName
  table_name: TableName
  column_name: ColumnName
  constraint_type: 'PRIMARY KEY' | 'FOREIGN KEY'
  f_schema_name: SchemaName
  f_table_name: TableName
  f_column_name: ColumnName
}

export const keys = `
  SELECT
    tc.table_schema schema_name,
    tc.table_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS f_schema_name,
    ccu.table_name AS f_table_name,
    ccu.column_name AS f_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE (tc.constraint_type = 'PRIMARY KEY' or tc.constraint_type = 'FOREIGN KEY')
    AND (ccu.table_schema != 'pg_catalog')
  ORDER BY tc.table_schema, tc.table_name, tc.constraint_type
`;


export interface PgTypeResult {
  name: TypeName
  pg_type: string
  schema_name: SchemaName
  fields: { index: number, name: ColumnName, pg_type: string, data_type: string, is_nullable: 'YES' | 'NO' }[]
}

export const types = `
SELECT udt_schema schema_name, udt_name "name", udt_name "pg_type", array_agg(json_build_object(
  'name', attribute_name,
  'is_nullable', is_nullable,
  'pg_type', attribute_udt_name,
  'data_type', data_type,
  'index', ordinal_position
)) AS fields
  FROM information_schema.attributes
  GROUP BY udt_schema, udt_name
`;

export interface PgFunctionResult {
  schema_name: SchemaName
  name: FunctionName
  args: string
  return_type: string
}

export const functions = `
  SELECT n.nspname AS schema_name,
       p.proname AS name,
       pg_get_function_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS return_type
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname NOT LIKE 'pg_%'
    AND n.nspname != 'information_schema'
    AND p.probin is null
    AND (pg_get_function_result(p.oid) != 'trigger')
`;
