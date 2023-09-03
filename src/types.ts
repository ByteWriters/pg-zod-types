import { ColumnName, EnumName, FunctionName, PgColumn, PgCustomType, PgEnum, PgFunction, PgSchema, PgTable, TypeName } from './postgres/types';

export type PgOperation = 'delete' | 'insert' | 'select' | 'update';

export type AnyPgObject = PgColumn | PgCustomType | PgEnum | PgFunction | PgTable
export type PgObjectWithOverride = AnyPgObject & { override?: string }

type PgTsFn<PgObject> = (pgObject: PgObject & { override?: string }, schema: PgSchema) => string
type FallbackNamer = PgTsFn<PgObjectWithOverride>

/** PG-object to string converters (used both for namers & builders) */
interface PgTsConverter {
  pgColumn: PgTsFn<PgColumn>
  pgCustomType: PgTsFn<PgCustomType>
  pgEnum: PgTsFn<PgEnum>
  pgFunction: PgTsFn<PgFunction>
}

// Passed as builder option OR provided by builder as defaults
export interface PgTsNamersOption {
  pgCustomType: PgTsFn<PgCustomType>
  pgCustomTypeValidator: PgTsFn<PgCustomType>
  pgEnum: PgTsFn<PgEnum>
  pgTable: PgTsFn<PgTable>
  pgTableValidator?: PgTsFn<PgTable> // If generator outputs both validator-function & inferred type
  fallback?: FallbackNamer
}

// Namer-object passed to builder
export interface PgTsNamers {
  getCustomTypeName: PgTsFn<PgCustomType>
  getCustomTypeValidatorName: PgTsFn<PgCustomType>
  getEnumName: PgTsFn<PgEnum>
  getTableName: PgTsFn<PgTable>
  getTableValidatorName?: PgTsFn<PgTable> // If generator outputs both validator-function & inferred type
}

export type BuilderFn<PgObject> = (
  pgObject: PgObject & { override?: string },
  namers: PgTsNamers,
  schema: PgSchema
) => string

export type TableBuilderFn = (
  pgTable: PgTable,
  getColumns: (pgTable: PgTable) => string,
  namers: PgTsNamers,
  schema: PgSchema,
) => string

export interface PgTsBuilder {
  pgColumn: BuilderFn<PgColumn>
  pgCustomType: BuilderFn<PgCustomType>
  pgEnum: BuilderFn<PgEnum>
  pgFunctions: BuilderFn<PgFunction[]>
  pgTable: TableBuilderFn
  defaultTemplate: (built: string, schema: PgSchema) => string
  defaultNamers: (PgTsNamersOption & { fallback?: FallbackNamer })
    | (Partial<PgTsNamersOption> & { fallback: FallbackNamer })
}

export interface TsBuilderOptions {
  builder?: PgTsBuilder
  namers?: Partial<PgTsNamersOption>
  overrides?: Partial<{
    pgColumn: Record<ColumnName,string>
    pgCustomType: Record<TypeName,string>
    pgEnum: Record<EnumName,string>
    pgFunction: Record<FunctionName,string>
  }>
  template?: (tsOutput: string, schema: PgSchema) => string
}
