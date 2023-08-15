/**
 * Converts column-meta into zod field definition
 * Passes entire DB struct to allow foreign key & enum matching
 */

import z from 'zod';
