/**
 * Default pg_type to zod type map
 * Can be overridden via config
 * Keys are matched on substring (timestamptz -> timestamp, int4 -> int)
 */

import z, { ZodType } from 'zod';
import { PgColumn } from '../postgres/types';
import { PgOperation } from './types';

export const pgColumn2zod = (column: PgColumn, operation: PgOperation) => {
  let baseType: ZodType = null;

  switch(column.type.pg_type) {
    case 'uuid': baseType = z.string().uuid(); break;
    case 'serial': baseType = z.number().int().min(1); break;

    case 'bool': baseType = z.boolean(); break;

    case 'double': baseType = z.number(); break;
    case 'int': baseType = z.number().int(); break;

    case 'text': baseType = z.string(); break;
    case 'timestamp': baseType = z.string().datetime(); break;

    case 'json': baseType = z.any(); break;

    case 'enum': {
      console.log('WTF', column);
      baseType = z.any(); break;
    }

    default: {
      switch(column.type.kind) {
        case 'enum': baseType = z.enum(column.type.values); break;
        default: baseType = z.any(); break;
      }
    }
  }

  const { array, pkey, type: { has_default, nullable } } = column;

  const zodBaseType = array ? z.array(baseType) : baseType;
  const zodBase = nullable ? zodBaseType.nullable() : zodBaseType;

  switch(operation) {
    case 'delete': return pkey ? zodBase : zodBase.optional();
    case 'insert': return (nullable || has_default) ? zodBase.optional() : zodBase;
    case 'update': return pkey ? zodBase : zodBase.optional();
    default: return zodBase.optional();
  }
}

export const pgColumn2zodString = (column: PgColumn, operation: PgOperation) => {
  let baseType = '';

  switch(column.type.pg_type) {
    case 'uuid': baseType = 'z.string().uuid()'; break;
    case 'serial': baseType = 'z.number().int().min(1)'; break;

    case 'bool': baseType = 'z.boolean()'; break;

    case 'double': baseType = 'z.number()'; break;
    case 'int': baseType = 'z.number().int()'; break;

    case 'text': baseType = 'z.string()'; break;
    case 'timestamp': baseType = 'z.string().datetime()'; break;

    case 'json': baseType = 'z.any()'; break;

    default: {
      switch(column.type.kind) {
        case 'enum': baseType = `z.enum([${column.type.values.map(v => `'${v}'`).join(', ')}])`; break; // @TODO NativeEnum - inject zod-stuff into schema.enums first
        default: baseType = 'z.any()'; break;
      }
    }
  }

  const { array, pkey, type: { has_default, nullable } } = column;

  const zodBaseType = array ? `z.array(${baseType})` : baseType;
  const zodBase = nullable ? `${zodBaseType}.nullable()` : zodBaseType;

  switch(operation) {
    case 'delete': return pkey ? zodBase : `${zodBase}.optional()`;
    case 'insert': return (nullable || has_default) ? `${zodBase}.optional()` : zodBase;
    case 'update': return pkey ? zodBase : `${zodBase}.optional()`;
    default: return `${zodBase}.optional()`;
  }
}

