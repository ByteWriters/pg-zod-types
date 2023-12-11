// Typed name-fields (both query results & Schema definitions)
export type SchemaName = string & { _type?: 'Schema' }
export type EnumName = string & { _type?: 'Enum' }
export type FunctionName = string & { _type?: 'Function' }
export type CustomTypeName = string & { _type?: 'CustomType' }
export type TableName = string & { _type?: 'Table' }
export type ColumnName = string & { _type?: 'Column' }
