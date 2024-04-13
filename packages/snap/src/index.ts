import { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text } from '@metamask/snaps-sdk';
import { z } from 'zod';

// Define the schema for permission requests
const PermissionsRequest = z.object({
  permissions: z.array(
    z.object({
      sessionAccount: z.object({
        caip10Address: z.string(),
      }).optional(),
      type: z.string(),
      data: z.object({
        caip10Address: z.string().optional(),
        limit: z.string().optional(),
      }).optional(),
      required: z.boolean(),
    })
  ),
});

type PermissionsRequest = z.infer<typeof PermissionsRequest>;

// Store for registered permission capabilities
const permissionCapabilities = new Map<string, string[]>();

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  switch (request.method) {
    case 'wallet_requestPermissions':
      // Validate the request against the schema
      const validatedRequest = PermissionsRequest.parse(request.params);

      // Check if any account snaps have registered the needed capabilities
      const capableAccounts = validatedRequest.permissions.map(permission => {
        const accountsForPermission = [...permissionCapabilities.entries()]
          .filter(([_, capabilities]) => capabilities.includes(permission.type))
          .map(([account]) => account);
        
        return accountsForPermission;
      }).flat();
      
      if (capableAccounts.length === 0) {
        throw new Error('No accounts found with the requested permission capabilities');
      }

      // TODO: Delegate to capable accounts to generate the PermissionsContext

      // Display a confirmation to the user
      const confirmationResult = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          content: panel([
            text(`The site ${origin} is requesting the following permissions:`),
            // TODO: Display the requested permissions
          ]),
        },
      });

      // TODO: Return the PermissionsContext if user approved, else throw

    case 'registerPermissionCapabilities':
      const { account, capabilities } = request.params;
      permissionCapabilities.set(account, capabilities);
      return true;

    default:
      throw new Error('Method not found.');
  }
};