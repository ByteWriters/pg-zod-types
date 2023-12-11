import { deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { getSchema } from '../postgres2';

const expectedJson = {
	name: "public",
	types: [
		{
			name: "role_type",
			type: "enum",
			values: [
				"admin",
				"user",
			],
		},
		{
			name: "uuid",
			type: "native",
		},
		{
			name: "custom_array_type",
			type: "custom",
			fields: [
				{
					name: "id",
					type: {
						name: "uuid",
						type: "native",
					},
					array: false,
					nullable: true,
				},
				{
					name: "roles",
					type: {
						name: "role_type",
						type: "enum",
						values: [
							"admin",
							"user",
						],
					},
					array: true,
					nullable: true,
				},
			],
		},
		{
			name: "user_auth_type",
			type: "custom",
			fields: [
				{
					name: "id",
					type: {
						name: "uuid",
						type: "native",
					},
					array: false,
					nullable: true,
				},
				{
					name: "role",
					type: {
						name: "role_type",
						type: "enum",
						values: [
							"admin",
							"user",
						],
					},
					array: false,
					nullable: true,
				},
			],
		},
		{
			name: "text",
			type: "native",
		},
		{
			name: "bool",
			type: "native",
		},
		{
			name: "timestamptz",
			type: "native",
		},
		{
			name: "int4",
			type: "native",
		},
		{
			name: "float8",
			type: "native",
		},
		{
			name: "jsonb",
			type: "native",
		},
	],
	tables: [
		{
			name: "auth",
			columns: [
				{
					name: "id",
					type: {
						name: "uuid",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "primary",
				},
				{
					name: "key",
					type: {
						name: "text",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
				{
					name: "hash",
					type: {
						name: "text",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
				{
					name: "disabled",
					type: {
						name: "bool",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
				{
					name: "valid_from",
					type: {
						name: "timestamptz",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
				{
					name: "valid_until",
					type: {
						name: "timestamptz",
						type: "native",
					},
					array: false,
					nullable: true,
					key_type: "none",
				},
			],
		},
		{
			name: "basic",
			columns: [
				{
					name: "id",
					type: {
						name: "uuid",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "primary",
				},
				{
					name: "text_optional",
					type: {
						name: "text",
						type: "native",
					},
					array: false,
					nullable: true,
					key_type: "none",
				},
				{
					name: "text_required",
					type: {
						name: "text",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
				{
					name: "text_required_with_default",
					type: {
						name: "text",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
				{
					name: "text_array",
					type: {
						name: "text",
						type: "native",
					},
					array: true,
					nullable: true,
					key_type: "none",
				},
				{
					name: "number_int",
					type: {
						name: "int4",
						type: "native",
					},
					array: false,
					nullable: true,
					key_type: "none",
				},
				{
					name: "number_array",
					type: {
						name: "float8",
						type: "native",
					},
					array: true,
					nullable: true,
					key_type: "none",
				},
				{
					name: "jsonb",
					type: {
						name: "jsonb",
						type: "native",
					},
					array: false,
					nullable: true,
					key_type: "none",
				},
				{
					name: "jsonb_object",
					type: {
						name: "jsonb",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
				{
					name: "jsonb_array",
					type: {
						name: "jsonb",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
			],
		},
		{
			name: "edge_cases",
			columns: [
				{
					name: "id",
					type: {
						name: "int4",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "primary",
				},
				{
					name: "type",
					type: {
						name: "custom_array_type",
						type: "custom",
						fields: [
							{
								name: "id",
								type: {
									name: "uuid",
									type: "native",
								},
								array: false,
								nullable: true,
							},
							{
								name: "roles",
								type: {
									name: "role_type",
									type: "enum",
									values: [
										"admin",
										"user",
									],
								},
								array: true,
								nullable: true,
							},
						],
					},
					array: true,
					nullable: true,
					key_type: "none",
				},
			],
		},
		{
			name: "user",
			columns: [
				{
					name: "id",
					type: {
						name: "uuid",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "primary",
				},
				{
					name: "auth_id",
					type: {
						name: "uuid",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "foreign",
					references: {
						table_name: "auth",
						name: "id",
						type: {
							name: "uuid",
							type: "native",
						},
						array: false,
						nullable: false,
						key_type: "primary",
					},
				},
				{
					name: "role",
					type: {
						name: "role_type",
						type: "enum",
						values: [
							"admin",
							"user",
						],
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
				{
					name: "name",
					type: {
						name: "text",
						type: "native",
					},
					array: false,
					nullable: false,
					key_type: "none",
				},
			],
		},
	],
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
});
