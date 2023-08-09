export interface PgEnum {
  name: string
  values: string[]
}

export interface PgColumn {
  name: string
  table: PgTable
  schema: PgSchema

  pg_type: string
  key_type: 'primary' | 'foreign' | null

  default: string | null
  nullable: boolean

  enum: PgEnum | null
  fkey: PgColumn | null // Probably needs lookup after querying
}

export interface PgTable {
  name: string
  schema: PgSchema

  columns: PgColumn[]
}

export interface PgSchema {
  name: string

  enums: PgEnum[]
  tables: PgTable[]
}
