import { PgColumn, PgCustomType, PgEnum, PgTable } from '../postgres/types';

export type PgOperation = 'delete' | 'insert' | 'select' | 'update';

export interface TsOptions {
  template?: (tsOutput: string) => string

  columnBuilder?: (pgColumn: PgColumn) => string

  enumBuilder?: (pgEnum: PgEnum) => string
  enumNamer?: (pg_name: string) => string

  typeBuilder?: (pgType: PgCustomType) => string
  typeNamer?: (pg_name: string) => string

  tableBuilder?: (pgTable: PgTable) => string
  tableNamer?: (pg_name: string) => string
  zodTableNamer?: (pg_name: string) => string

  globalNamer?: (pg_name: string) => string   // Global, unless specified on type
}

export interface TableBuilderOptions {
  columnBuilder?: (pgColumn: PgColumn) => string
  getEnumName?: (pg_name: string) => string
  getTableName?: (pg_name: string) => string
  getZodTableName?: (pg_name: string) => string
  getGlobalName?: (pg_name: string) => string
}
