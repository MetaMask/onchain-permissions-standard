/* Onchain Permissions Standard Types
 *
 * This file is intended to define the types involved in the Onchain Permission Standard.
 * The types are defined as zod types, which can both export Typescript types, and be used as type validators.
 *
 * The zod types are prefixed with z, and the types are also exported.
 */

import { z } from 'zod';

export const zAddress = z.object({
  caip10Address: z.string(),
});

export type Address = z.infer(zSessionAccount);

// Rather than only define permissions by name,
// We can make this an object and leave room for forward-extensibility.
export const zTypeDescriptor = z.object({
  name: z.string(),
});

export const zRequestedPermission = z.object({
  sessionAccount: zAddress,
  type: zTypeDescriptor,
  justification: z.string().optional(),
  data: z
    .object()
    .optional(),
  required: z.boolean(),
});

export const Permission = z.infer(zRequestedPermission);

export const zPermissionsRequest = z.object({
  permissions: z.array(zRequestedPermission),
});

export const PermissionsRequest = z.infer(zPermissionsRequest);

export const zGrantedPolicy = z.object({
  sessionAccount: zAddress,
  type: zTypeDescriptor,
  data: z.object({
    caip10Address: z.string(),
    limit: z.number().optional(),
  }).optional(),
});

export const zPermissionsResponse = z.object({
  grantedPolicy: zGrantedPolicy,
  submitToAddress: z.string(),
  permissionsContext: z.string(),
  initCode: z.string().optional(),
  upgradeOps: z.array(z.string()).optional(),
});

export const PermissionsResponse = z.infer(zPermissionsResponse);
