import { deepStrictEqual, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { getSchema } from '../postgres2';

const expectedJson = {
	"name": "public",
	"types": [
		{
			"name": "role_type",
			"variant": "enum",
			"values": [
				"admin",
				"user"
			]
		},
		{
			"name": "uuid",
			"variant": "builtin"
		},
		{
			"name": "custom_array_type",
			"variant": "custom",
			"fields": [
				{
					"name": "id",
					"type": {
						"name": "uuid",
						"variant": "builtin"
					},
					"array": false,
					"nullable": true
				},
				{
					"name": "roles",
					"type": {
						"name": "role_type",
						"variant": "enum",
						"values": [
							"admin",
							"user"
						]
					},
					"array": true,
					"nullable": true
				}
			]
		},
		{
			"name": "user_auth_type",
			"variant": "custom",
			"fields": [
				{
					"name": "id",
					"type": {
						"name": "uuid",
						"variant": "builtin"
					},
					"array": false,
					"nullable": true
				},
				{
					"name": "role",
					"type": {
						"name": "role_type",
						"variant": "enum",
						"values": [
							"admin",
							"user"
						]
					},
					"array": false,
					"nullable": true
				}
			]
		},
		{
			"name": "text",
			"variant": "builtin"
		},
		{
			"name": "bool",
			"variant": "builtin"
		},
		{
			"name": "timestamptz",
			"variant": "builtin"
		},
		{
			"name": "int4",
			"variant": "builtin"
		},
		{
			"name": "float8",
			"variant": "builtin"
		},
		{
			"name": "jsonb",
			"variant": "builtin"
		}
	],
	"functions": [
		{
			"name": "f_user_authorize",
			"arguments": [
				{
					"name": "user_id",
					"type": {
						"name": "uuid",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false
				},
				{
					"name": "key",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false
				},
				{
					"name": "hash",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false
				}
			],
			"returnType": {
				"name": "f_user_authorize_return",
				"type": {
					"name": "user_auth_type",
					"variant": "custom",
					"fields": [
						{
							"name": "id",
							"type": {
								"name": "uuid",
								"variant": "builtin"
							},
							"array": false,
							"nullable": true
						},
						{
							"name": "role",
							"type": {
								"name": "role_type",
								"variant": "enum",
								"values": [
									"admin",
									"user"
								]
							},
							"array": false,
							"nullable": true
						}
					]
				},
				"array": false,
				"nullable": true
			}
		},
		{
			"name": "f_edge_cases",
			"arguments": [
				{
					"name": "user_ids",
					"type": {
						"name": "uuid",
						"variant": "builtin"
					},
					"array": true,
					"nullable": false
				},
				{
					"name": "roles",
					"type": {
						"name": "role_type",
						"variant": "enum",
						"values": [
							"admin",
							"user"
						]
					},
					"array": true,
					"nullable": false
				},
				{
					"name": "auths",
					"type": {
						"name": "user_auth_type",
						"variant": "custom",
						"fields": [
							{
								"name": "id",
								"type": {
									"name": "uuid",
									"variant": "builtin"
								},
								"array": false,
								"nullable": true
							},
							{
								"name": "role",
								"type": {
									"name": "role_type",
									"variant": "enum",
									"values": [
										"admin",
										"user"
									]
								},
								"array": false,
								"nullable": true
							}
						]
					},
					"array": true,
					"nullable": false
				}
			],
			"returnType": {
				"name": "f_edge_cases_return",
				"type": {
					"name": "user_auth_type",
					"variant": "custom",
					"fields": [
						{
							"name": "id",
							"type": {
								"name": "uuid",
								"variant": "builtin"
							},
							"array": false,
							"nullable": true
						},
						{
							"name": "role",
							"type": {
								"name": "role_type",
								"variant": "enum",
								"values": [
									"admin",
									"user"
								]
							},
							"array": false,
							"nullable": true
						}
					]
				},
				"array": true,
				"nullable": true
			}
		}
	],
	"tables": [
		{
			"name": "auth",
			"columns": [
				{
					"name": "id",
					"type": {
						"name": "uuid",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "primary"
				},
				{
					"name": "key",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				},
				{
					"name": "hash",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				},
				{
					"name": "disabled",
					"type": {
						"name": "bool",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				},
				{
					"name": "valid_from",
					"type": {
						"name": "timestamptz",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				},
				{
					"name": "valid_until",
					"type": {
						"name": "timestamptz",
						"variant": "builtin"
					},
					"array": false,
					"nullable": true,
					"key_type": "none"
				}
			]
		},
		{
			"name": "basic",
			"columns": [
				{
					"name": "id",
					"type": {
						"name": "uuid",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "primary"
				},
				{
					"name": "text_optional",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": false,
					"nullable": true,
					"key_type": "none"
				},
				{
					"name": "text_required",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				},
				{
					"name": "text_required_with_default",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				},
				{
					"name": "text_array",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": true,
					"nullable": true,
					"key_type": "none"
				},
				{
					"name": "number_int",
					"type": {
						"name": "int4",
						"variant": "builtin"
					},
					"array": false,
					"nullable": true,
					"key_type": "none"
				},
				{
					"name": "number_array",
					"type": {
						"name": "float8",
						"variant": "builtin"
					},
					"array": true,
					"nullable": true,
					"key_type": "none"
				},
				{
					"name": "jsonb",
					"type": {
						"name": "jsonb",
						"variant": "builtin"
					},
					"array": false,
					"nullable": true,
					"key_type": "none"
				},
				{
					"name": "jsonb_object",
					"type": {
						"name": "jsonb",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				},
				{
					"name": "jsonb_array",
					"type": {
						"name": "jsonb",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				}
			]
		},
		{
			"name": "edge_cases",
			"columns": [
				{
					"name": "id",
					"type": {
						"name": "int4",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "primary"
				},
				{
					"name": "type",
					"type": {
						"name": "custom_array_type",
						"variant": "custom",
						"fields": [
							{
								"name": "id",
								"type": {
									"name": "uuid",
									"variant": "builtin"
								},
								"array": false,
								"nullable": true
							},
							{
								"name": "roles",
								"type": {
									"name": "role_type",
									"variant": "enum",
									"values": [
										"admin",
										"user"
									]
								},
								"array": true,
								"nullable": true
							}
						]
					},
					"array": true,
					"nullable": true,
					"key_type": "none"
				}
			]
		},
		{
			"name": "user",
			"columns": [
				{
					"name": "id",
					"type": {
						"name": "uuid",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "primary"
				},
				{
					"name": "auth_id",
					"type": {
						"name": "uuid",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "foreign",
					"references": {
						"table_name": "auth",
						"name": "id",
						"type": {
							"name": "uuid",
							"variant": "builtin"
						},
						"array": false,
						"nullable": false,
						"key_type": "primary"
					}
				},
				{
					"name": "role",
					"type": {
						"name": "role_type",
						"variant": "enum",
						"values": [
							"admin",
							"user"
						]
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				},
				{
					"name": "name",
					"type": {
						"name": "text",
						"variant": "builtin"
					},
					"array": false,
					"nullable": false,
					"key_type": "none"
				}
			]
		}
	],
	"pkeys": [
		{
			"table_name": "auth",
			"name": "id",
			"type": {
				"name": "uuid",
				"variant": "builtin"
			},
			"array": false,
			"nullable": false,
			"key_type": "primary"
		},
		{
			"table_name": "basic",
			"name": "id",
			"type": {
				"name": "uuid",
				"variant": "builtin"
			},
			"array": false,
			"nullable": false,
			"key_type": "primary"
		},
		{
			"table_name": "edge_cases",
			"name": "id",
			"type": {
				"name": "int4",
				"variant": "builtin"
			},
			"array": false,
			"nullable": false,
			"key_type": "primary"
		},
		{
			"table_name": "user",
			"name": "id",
			"type": {
				"name": "uuid",
				"variant": "builtin"
			},
			"array": false,
			"nullable": false,
			"key_type": "primary"
		}
	]
};

describe('postgres schema builder', () => {
	it('builds expected schema from test DB', async () => {
		const schema = await getSchema({
			host: process.env.POSTGRES_HOST || 'localhost',
			user: 'postgres',
			password: 'postgres'
		});

		const json = schema.toJson();

		deepStrictEqual(json, expectedJson);
	});

	it('skips stuff', async () => {
		const schema = await getSchema({
			host: process.env.POSTGRES_HOST || 'localhost',
			user: 'postgres',
			password: 'postgres'
		}, {
			name: 'public',
			skip: {
				types: ['role_type', 'custom_array_type', 'user_auth_type'],
				functions: ['f_user_authorize', 'f_edge_cases'],
				tables: ['auth', 'basic', 'edge_cases', 'user']
			}
		});

		const json = schema.toJson();

		strictEqual(json.functions.length, 0);
		strictEqual(json.tables.length, 0);
		strictEqual(json.types.filter(({ variant }) => variant !== 'builtin').length, 0);
	});
});
