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

export type Address = z.infer<typeof zAddress>;

// Rather than only define permissions by name,
// We can make this an object and leave room for forward-extensibility.
export const zTypeDescriptor = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export const zRequestedPermission = z.object({
  sessionAccount: zAddress,
  type: zTypeDescriptor,
  justification: z.string().optional(),

  // Data is specific to this `type`, and will be interpreted by the permission's provider
  data: z
    .object()
    .optional(),

  required: z.boolean().optional(),
});

export const Permission = z.infer<typeof zRequestedPermission>;

export const zPermissionsRequest = z.object({
  permissions: z.array(zRequestedPermission),
});

export const PermissionsRequest = z.infer<typeof zPermissionsRequest>;

export const zGrantedPolicy = z.object({
  sessionAccount: zAddress,
  type: zTypeDescriptor,

  // Data can vary type by type,
  // Is provided directly from the permission's provider.
  data: z.object().optional(),
});

const zUpgradeOp = z.object({
  target: zAddress,
  operation: z.string(),
});

export const zPermissionsResponse = z.object({
  grantedPolicy: zGrantedPolicy,
  submitToAddress: zAddress,
  permissionsContext: z.string(),
  initCode: z.string().optional(),
  upgradeOps: z.array(zUpgradeOp).optional(),
});

export const PermissionsResponse = z.infer<typeof zPermissionsResponse>;
