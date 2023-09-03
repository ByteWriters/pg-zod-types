import { PgFunctionResult, PgTypeResult } from './queries';
import { PgCustomType, PgFunction, PgSchema, PgSchemaOptions, PgType } from './types';

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

// Lookup existing enum or customType, return basic field otherwise
const getPgType = (
  schema: PgSchema, { pg_type, ...info }: { pg_type: string } & Record<string,any>
): PgType => {
  const enumType = schema.enums.find(e => e.pg_type === pg_type);
  if (enumType) return { kind: 'enum', ...info, ...enumType };

  const customType = schema.types.find(t => t.pg_type === pg_type);
  if (customType) return { kind: 'custom', ...info, ...customType };

  return { kind: 'basic', pg_type, ...info };
}


/** User-defined composite types builder (queried PgTypeResult -> PgSchema['types']) */
export const buildCustomType = (schema: PgSchema) => (
  { pg_type, fields }: PgTypeResult
): PgCustomType => {
  const typeFields = fields.sort(
    (a, b) => a.index > b.index ? 1 : -1
  ).map(({ name, is_nullable, pg_type: _pg_type, data_type }) => {
    const is_array = data_type === 'ARRAY';
    const nullable = is_nullable === 'YES';

    const pg_type = is_array ? _pg_type.replace('_', '') : _pg_type;
    const type = getPgType(schema, { pg_type, nullable, array: is_array });

    return { name, type };
  });

  return {
    name: pg_type,
    pg_type,
    fields: typeFields
  };
};

/**
 * Custom postgres-defined function definition builder
 * @TODO Current query doesn't provide a lot of type info
 **/
export const buildFunction = (schema: PgSchema) => (
  { name, args: args_string, return_type }: PgFunctionResult
): PgFunction => {
  const args: PgFunction['args'] = args_string.split(', ').map(arg_string => {
    const [ arg_name, pg_type ] = arg_string.split(' ');
    const type = getPgType(schema, { pg_type });

    return { name: arg_name, type };
  });

  const returns = getPgType(schema, { pg_type: return_type });

  return {
    name,
    args,
    returns
  };
}

/** Applies skip-options  */
export const filterOptions = (
  schemas: PgSchema[], options: PgSchemaOptions[]
) => options.map(({ name, skip }) => {
  const schema = schemas.find(s => s.name === name);

  if (!schema) throw new Error(`Schema "${name}" not found in DB`);
  if (!skip || !Object.keys(skip).length) return schema;
  
  return Object.entries(skip).reduce((output, [ type, skipList ]) => {
    const unfiltered = [...(schema[type])];
    const filtered = unfiltered.filter(entry => !skipList.includes(entry.name));
    return { ...output, [type]: filtered };
  }, schema);
});

