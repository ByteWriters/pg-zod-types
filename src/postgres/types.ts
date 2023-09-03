// Typed name-fields (both query results & Schema definitions)
export type SchemaName = string & { _type?: 'Schema' }
export type EnumName = string & { _type?: 'Enum' }
export type FunctionName = string & { _type?: 'Function' }
export type TypeName = string & { _type?: 'Type' }
export type TableName = string & { _type?: 'Table' }
export type ColumnName = string & { _type?: 'Column' }

export type PgBaseType<T> = T & {
  pg_type: string
  array?: boolean
  has_default?: boolean
  nullable?: boolean
}

export interface PgTypes {
  basic: PgBaseType<{}>
  custom: PgBaseType<Omit<PgCustomType,'name'|'pg_type'>>
  enum: PgBaseType<Omit<PgEnum,'name'>>
  foreign: PgBaseType<{
    column: PgColumn
  }>
}

export type PgType = {
  [Type in keyof PgTypes]: { kind: Type } & PgTypes[Type]
}[keyof PgTypes]

export interface PgField {
  name: ColumnName
  type: PgType
}

/** Table-level objects */
export interface PgColumn extends PgField {
  pkey?: boolean
}

export interface PgCustomType {
  name: TypeName   // == pg_type; used for skip-lookup
  pg_type: string
  fields: PgField[]
}

export interface PgEnum {
  name: EnumName   // == pg_type; used for skip-lookup
  pg_type: string
  values: [ string, ...string[] ] // Zod requires at least one value element
}

/** Schema-level objects */
export interface PgFunction {
  name: string
  args: PgField[]
  returns: PgType
}

export interface PgTable {
  name: TableName
  columns: PgColumn[]
}

// Top-level postgres options & output
export interface PgSchemaOptions {
  name: SchemaName
  skip?: {
    enums?: EnumName[]
    functions?: FunctionName[]
    tables?: TableName[]
    types?: TypeName[]
  }
  outFile?: string
}

export interface PgSchema {
  name: SchemaName
  enums: PgEnum[]
  functions: PgFunction[]
  types: PgCustomType[]
  tables: PgTable[]
}
