import { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text, form, input, button } from '@metamask/snaps-sdk';
import { z } from 'zod';
import { createMyLibrary } from './createMyLibrary.ts'


type AccountSettings = {
  permissions: Array<unknown>,
}
const settings: AccountSettings = await getPersistedSettings() || createFreshSettings();

// Attn SCA devs:
// This is the library you implement for YOUR contract account.
// Feel free to just modify the example library!
const myLibrary = createMyLibrary(settings);


// Onchain Permissions Standard interface
const PermissionsRequest = z.object({
  permissions: z.array(
    z.object({
      sessionAccount: z
        .object({
          caip10Address: z.string(),
        })
        .optional(),
      type: z.string(),
      data: z
        .object({
          caip10Address: z.string().optional(),
          limit: z.string().optional(),
        })
        .optional(),
      required: z.boolean(),
    }),
  ),
});

type PermissionsRequest = z.infer<typeof PermissionsRequest>;

type Permission = {
  type: string;
  methodName: string;
  data: Record<string, any>;
};

const myLibrary = createMyLibrary(settings);

export const onRpcRequest: OnRpcRequestHandler = accountKit.handler();

// TODO: Implement:
function getPersistedSettings () : AccountSettings {
  // However you get storage from snaps;
  return false;
}
function createFreshSettings () : AccountSettings {
  return {
    permissions: [],
  }
}
