// Typed name-fields (both query results & Schema definitions)
export type SchemaName = string & { _type?: 'Schema' }
export type TableName = string & { _type?: 'Table' }
export type EnumName = string & { _type?: 'Enum' }
export type TypeName = string & { _type?: 'Type' }
export type ColumnName = string & { _type?: 'Column' }

export type PgBaseType<T> = T & {
  has_default: boolean
  pg_type: string       // Contains either a native type (uuid/string/number/...) or 
  nullable: boolean
}

export interface PgTypes {
  basic: PgBaseType<{}>
  enum: PgBaseType<PgEnum>
  foreign: PgBaseType<{
    column: PgColumn
  }>
}

export type PgType = {
  [Type in keyof PgTypes]: { kind: Type } & PgTypes[Type]
}[keyof PgTypes]

/** Table-level objects */
export interface PgColumn {
  name: ColumnName
  type: PgType
  array: boolean
  pkey: boolean
}

export interface PgCustomType {
  pg_type: TypeName
  fields: Omit<PgColumn, 'pkey'>[]
}

export interface PgEnum {
  pg_type: EnumName
  values: [ string, ...string[] ] // Zod requires at least one value element
}

/** Schema-level objects */
export interface PgFunction {
  name: string
  arguments: {
    name: string
    type: PgType
  }[]
  returns: PgType
}

export interface PgTable {
  name: TableName
  columns: PgColumn[]
}

export interface PgSchema {
  name: SchemaName
  enums: PgEnum[]
  types: PgCustomType[]
  tables: PgTable[]
}

/** Top-level export */
export interface PgDb {
  name: string
  schemas: PgSchema[]
  getColumn: (schema_name: SchemaName, table_name: TableName, column_name: ColumnName) => PgColumn
  getTable: (schema_name: SchemaName, table_name: TableName) => PgTable
  getSchema: (schema_name: SchemaName) => PgSchema
  getSchemaColumns: (schema_name: SchemaName) => PgColumn[]
  getSchemaPkeys: (schema_name: SchemaName) => PgColumn[]
}
