type KeyType = 'primary' | 'foreign' | null

export interface PgEnum {
  name: string
  values: string[]
}

export interface PgColumn {
  schema_name: string
  table_name: string
  name: string

  pg_type: string
  key_type: KeyType

  nullable_read: boolean
  nullable_write: boolean

  enum: PgEnum | null
  fkey: PgColumn | null
}

export interface PgTable {
  name: string
  columns: PgColumn[]
}

export interface PgSchema {
  name: string
  enums: PgEnum[]
  tables: PgTable[]
}
