import { z } from 'zod';
import { zPermissionsRequest, zTypeDescriptor } from './types.ts';
const PERMISSIONS_SNAP_ID = 'TODO_PLACEHOLDER';

// This is a local permissions definition.
// It is how the kernel encodes its knowledge of a permission.
// Its type descriptor, and the host that granted it.
type zPermission = z.object({
  // An identifier for which snap this permission belongs to:
  hostId: z.string(),

  // A type used for matching requests:
  type: zTypeDescriptor,

  // An identifier used for identifying the specific permission to the snap:
  hostPermissionId: z.string(),
});

type Permission = z.infer(zPermission);

const zPermissionsOffer = z.object({
  // Used to propose this permission in response to requests:
  type: zTypeDescriptor,

  // Used to represent the permission to the user:
  proposedName: z.string(),

  // Used to call the method on the snap:
  id: z.string(),
});

type PermissionsOffer = z.infer(zPermissionsOffer);

// Store for registered permission capabilities
const permissions: Permission[] = [];

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  switch (request.method) {

    // This method is used by snaps to offer its cryptographic abilities as permissions:
    case 'wallet_offerPermission':
      const offered = zPermissionsOffer.passthrough().parse(request.params);
      const permission: Permission = {
        hostId: origin,
        type: offered.type,
        hostPermissionId: offered.id,
      };
      // This would be a reasonable place to check for duplicates, but I'm just hackin' right now.
      permissions.push(permission);
      return true;

    // This method is used by dapps to request onchain permissions:
    case 'wallet_requestOnchainPermissions':
      // Validate the request against the schema
      const validatedRequest = zPermissionsRequest.passthrough().parse(request.params);

      // Filter and deduplicate permissions
      const relevantPermissions = validatedRequest.permissions.map(requestedPermission => {
        return permissions.filter(storedPermission => 

          // Currently just matches type. Here is where we would add a rich type description system.
          // Could start by recognizing some extra parameters for known permission types,
          // But eventually would be great to have some general-purpose type fields.
          return storedPermission.type.name === requestedPermission.type.name;
        );
      }).flat();

      if (relevantPermissions.length === 0) {
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
              ...relevantPermissions.map((permission, index) => 
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
      const selectedPermission = relevantPermissions[selectedIndex];

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
    default:
      throw new Error('Method not found.');
  }
};

