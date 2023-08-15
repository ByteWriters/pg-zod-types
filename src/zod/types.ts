import z, { ZodType } from 'zod';

import { PgColumn } from '../postgres/types';
import { pg2zodType } from './type_map';

export interface ZodColumn extends PgColumn {
  zod: ZodType
};

const col: ZodColumn = {
  name: 'id',
  pkey: true,
  array: false,
  type: {
    kind: 'basic',
    nullable_read: false,
    nullable_write: true,
    pg_type: 'uuid'
  },
  zod: z.array(pg2zodType['uuid'])
}
