import { z } from 'zod';
import { zPermissionsRequest, zRequestedPermission, zTypeDescriptor, zAddress } from '../../../scripts/types.ts';

// This is a local permissions definition.
// It is how the kernel encodes its knowledge of a permission.
// Its type descriptor, and the host that granted it.
const zPermission = z.object({
  // An identifier for which snap this permission belongs to:
  hostId: z.string(),

  // A type used for matching requests:
  type: zTypeDescriptor,

  // An identifier used for identifying the specific permission to the snap:
  hostPermissionId: z.string(),
});

type Permission = z.infer<typeof zPermission>;

export const zPermissionsOffer = z.object({
  // Used to propose this permission in response to requests:
  type: zTypeDescriptor,

  // Used to represent the permission to the user:
  proposedName: z.string(),

  // Used to call the method on the snap:
  id: z.string(),
});

export type PermissionsOffer = z.infer<typeof zPermissionsOffer>;

export const zPermissionToGrantParams = z.object({
  permissionId: z.string(),
  sessionAccount: zAddress,
});

export type PermissionToGrantParams = z.infer<typeof zPermissionToGrantParams>;

// Store for registered permission capabilities
const permissions: Permission[] = [];

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  let permission: Permission;
  switch (request.method) {

    // This method is used by snaps to offer its cryptographic abilities as permissions:
    case 'wallet_offerOnchainPermission':
      const offered = zPermissionsOffer.passthrough().parse(request.params);
      permission: Permission = {
        hostId: origin,
        type: offered.type,
        hostPermissionId: offered.id,
      };
      // This would be a reasonable place to check for duplicates, but I'm just hackin' right now.
      permissions.push(permission);
      return true;

    // This method is used by dapps to request an onchain permission.
    // Starting with a singular permission request for simplicity of implementation.
    case 'wallet_requestOnchainPermission':
      // Validate the request against the schema
      try {
        const requestedPermission: RequestedPermission = zRequestedPermission.passthrough().parse(request.params);
      } catch (err) {
        console.log('Validation error: ', err);
      }

      // Filter and deduplicate permissions
      const relevantPermissions = permissions.filter((storedPermission) => {
        // Currently just matches type. Here is where we would add a rich type description system.
        // Could start by recognizing some extra parameters for known permission types,
        // But eventually would be great to have some general-purpose type fields.
        return storedPermission.type.name === requestedPermission.type.name;
      });

      if (relevantPermissions.length === 0) {
        console.log('no relevant permissions found');
        // TODO: Here we should return a proper JSON-RPC error.
        // Might be nice to obscure whether the user declined or didn't have it.
        // Maybe add a delay to prevent brute force fingerprinting,
        // Or actually show the user UI representing that something was requested they don't have,
        // Ensuring a maximally human-like reaction time and obscuring the reason.
        return false;
      }

      // Present the user with the list of permissions to choose from
      const interfaceId = await snap.request({
        method: 'snap_createInterface',
        params: {
          ui: form({
            name: 'permissions-form',
            children: [
              text(`The site at ${origin} requests access to a **${permission.type}** permission.`),
              permission.justification ? panel([
                heading("The requestor provides this justification for the request:"),
                text(permission.justification),
              ]) : null,
              text('Select a permission to grant, or click cancel:'),
              ...relevantPermissions.map((permission, index) => 
                text(`${index + 1}. ${address(permission.hostId)}: ${permission.proposedName}`)
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

      // Get the user's selection:
      const selectedIndex = parseInt(result['selected-permission'], 10) - 1;
      const selectedPermission = relevantPermissions[selectedIndex];

      if (!selectedPermission) {
        // Ideally give the user feedback and a chance to choose correctly.
        // More ideally replace all this with a nice chooser UI.
        return false;
      }

      // Since I'm not sure if we can inline the attenuators from another snap yet, the permission-providing snap will be responsible
      // for rendering its attenuator UI after the permission has been selected, as part of the granting process.
      const grantParams: PermissionToGrantParams = {
        permissionId: permission.hostPermissionId,
        sessionAccount: permission.sessionAccount,
      };
      const permissionsResponse: PermissionsResponse = zPermissionsResponse.passthrough().parse(await snap.request({
        method: "wallet_invokeSnap",
        params: {
          snapId: permission.hostId,
          request: {
            method: "permissionProvider_grantAttenuatedPermission",
            params: grantParams,
          },
        },
      }));

      return permissionsResponse;

    default:
      throw new Error('Method not found.');
  }
};
