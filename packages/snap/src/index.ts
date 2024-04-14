import { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text, form, input, button } from '@metamask/snaps-sdk';
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

type Permission = {
  type: string;
  methodName: string;
  data: Record<string, any>;
};

// Store for registered permission capabilities
const permissionCapabilities = new Map<string, Permission[]>();

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  switch (request.method) {
    case 'wallet_requestPermissions':
      // Validate the request against the schema
      const validatedRequest = PermissionsRequest.parse(request.params);

      // Filter and deduplicate permissions
      const relevantPermissions = validatedRequest.permissions.map(requestedPermission => {
        return [...permissionCapabilities.values()].flat().filter(storedPermission => 
          storedPermission.type === requestedPermission.type &&
          requestedPermission.data && 
          Object.entries(requestedPermission.data).every(([key, value]) =>
            storedPermission.data[key] === value  
          )
        );
      }).flat();

      const uniquePermissions = [...new Set(relevantPermissions.map(p => JSON.stringify(p)))].map(JSON.parse);

      if (uniquePermissions.length === 0) {
        throw new Error('No matching permissions found');
      }

      // Present the user with the list of permissions to choose from
      const interfaceId = await snap.request({
        method: 'snap_createInterface',
        params: {
          ui: form({
            name: 'permissions-form',
            children: [
              text('Select a permission to grant:'),
              ...uniquePermissions.map((permission, index) => 
                text(`${index + 1}. ${permission.type} (${JSON.stringify(permission.data)})`)
              ),
              input({
                name: 'selected-permission',
                placeholder: 'Enter the number of your selection',
              }),
              button({
                value: 'Submit',
                buttonType: 'submit',
              }),
            ],
          }),
        },
      });

      const result = await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'Alert',
          id: interfaceId,
        },
      });

      const selectedIndex = parseInt(result['selected-permission'], 10) - 1;
      const selectedPermission = uniquePermissions[selectedIndex];

      if (!selectedPermission) {
        throw new Error('Invalid permission selection');
      }

      // Call the selected snap's method to get the PermissionsContext
      const permissionsContext = await snap.request({
        method: selectedPermission.methodName,
        params: {
          data: selectedPermission.data,
          sessionAccount: validatedRequest.permissions[selectedIndex].sessionAccount,
        },
      });

      return permissionsContext;

    case 'registerPermissionCapabilities':
      const newPermissions = z.array(z.object({
        type: z.string(),
        methodName: z.string(),
        data: z.record(z.any()),
      })).parse(request.params);

      permissionCapabilities.set(origin, newPermissions);
      return true;

    default:
      throw new Error('Method not found.');
  }
};