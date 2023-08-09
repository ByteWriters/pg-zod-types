/**
 * Converts column-meta into zod field definition
 * Passes entire DB struct to allow foreign key & enum matching
 */

// Basic Postgres column 
const baseMap = {

}


import z from 'zod';

enum ROLE_TYPE {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

const roleType = z.nativeEnum(ROLE_TYPE);

const user = z.object({
  id: z.string()
});

type User = z.infer<typeof user> & { id: string & { _pkeyOf?: 'user' } }
type Org = { id: string & { _pkeyOf?: 'org' } }
type Credential = { user_id: User['id'] }

const org: Org = {
  id: '5'
}

const admin: User = {
  id: '2'
}
