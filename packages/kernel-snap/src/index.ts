import { z } from 'zod';
import { zPermissionsRequest, zRequestedPermission, zPermissionsResponse, PermissionsResponse, zTypeDescriptor, zAddress } from '../../../scripts/types.ts';
import { UserInputEventType, OnUserInputHandler, panel, heading, copyable, text, form, row, input, button } from '@metamask/snaps-sdk';

let selectedPermissionValue = null;

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
  proposedName: z.string(),
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
      console.log('permission offer', request.params);
      const offered = zPermissionsOffer.passthrough().parse(request.params);
      permission = {
        hostId: origin,
        type: offered.type,
        hostPermissionId: offered.id,

        // TODO: Ensure no duplicate named permissions, always give a user a chance to name.
        proposedName: offered.proposedName,
      };
      // This would be a reasonable place to check for duplicates, but I'm just hackin' right now.
      console.log('new permission registering', permission);
      permissions.push(permission);
      console.log('Added to permissions. Full list:', permissions);
      return true;

    // This method is used by dapps to request an onchain permission.
    // Starting with a singular permission request for simplicity of implementation.
    case 'wallet_requestOnchainPermission':
      console.log('permissions requested', request.params);
      let requestedPermission;
      // Validate the request against the schema
      try {
        requestedPermission = zRequestedPermission.passthrough().parse(request.params);
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
      console.log(`found ${relevantPermissions.length} candidates`, relevantPermissions);

      if (relevantPermissions.length === 0) {
        const ui = panel([
          heading('Permission Request'),
          text(`The site at ${origin} requests access to **${requestedPermission.type.name}**`),
          requestedPermission.justification ? panel([
            heading("Their justification:"),
            copyable(requestedPermission.justification),
          ]) : null,
          text(`However, you have nothing of that type.`),
        ]);

        interfaceId = await snap.request({
          method: 'snap_createInterface',
          params: {
            ui,
          },
        });

        result = await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'alert',
            id: interfaceId,
          },
        });

        return false;
      }

      // Present the user with the list of permissions to choose from
      console.log('Prompting user for selection');
      let interfaceId;
      try {
        const ui = panel([
          heading('Permission Request'),
          text(`The site at ${origin} requests access to **${requestedPermission.type.name}**`),
          requestedPermission.justification ? panel([
            heading("Their justification:"),
            copyable(requestedPermission.justification),
          ]) : null,
          panel([
            heading('Your Inventory'),
            ...relevantPermissions.map((permission, index) => {
              console.log('generating a row for permission', permission.proposedName)
              return row(`${index + 1}`, text(permission.proposedName));
            }),
            input({
              name: 'selected-permission',
              placeholder: 'Enter the number of your selection',
            }),
          ])
        ]);

        console.log('ui generated', ui);
        interfaceId = await snap.request({
          method: 'snap_createInterface',
          params: {
            ui,
          },
        });
      } catch (err) {
        console.log('Problem creating UI', err);
      }

      console.log('interface build, trying', interfaceId);
      let result;
      try {
        await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'confirmation',
            id: interfaceId,
          },
        });
      } catch (err) {
        console.log('Problem rendering UI', err);
      }

      // Get the user's selection:
      console.log('selected permission value', selectedPermissionValue);
      const selectedIndex = parseInt(selectedPermissionValue) - 1;
      console.log('index ', selectedIndex);
      const selectedPermission: Permission = relevantPermissions[selectedIndex];
      console.log('user selected', selectedPermission);

      if (!selectedPermission) {
        // Ideally give the user feedback and a chance to choose correctly.
        // More ideally replace all this with a nice chooser UI.
        return false;
      }

      // Since I'm not sure if we can inline the attenuators from another snap yet, the permission-providing snap will be responsible
      // for rendering its attenuator UI after the permission has been selected, as part of the granting process.
      console.log('Requesting approval from permission provider');
      const grantParams: PermissionToGrantParams = {
        permissionId: selectedPermission.hostPermissionId,
        sessionAccount: requestedPermission.sessionAccount,
      };
      console.log('requesting permission');
      try {

        const rawResponse = await snap.request({
          method: "wallet_invokeSnap",
          params: {
            snapId: selectedPermission.hostId,
            request: {
              method: "permissionProvider_grantAttenuatedPermission",
              params: grantParams,
            },
          },
        });
        console.log('raw response', rawResponse);
        // TODO: Figure out why this fails and fix it.
        // The error message is not currently helpful.
        // const permissionsResponse: PermissionsResponse = zPermissionsResponse.passthrough().parse(rawResponse);
        const permissionsResponse = rawResponse;
        console.log('validated response');

        console.log('Created permission response to return to dapp', permissionsResponse);
        return permissionsResponse;
      } catch (err) {
        console.log('Problem getting approval from permissions provider', err);
        console.trace(err);
      }

    default:
      throw new Error('Method not found.');
  }
};

export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
  console.log('On user input called', { id, event });
  console.dir({ id, event });
  if (event.name === 'selected-permission') {
    console.log("The submitted permission values are", event.value);
    selectedPermissionValue = event.value;
  }
};

function log (anything) {
  console.log(JSON.stringify(anything, null, 2));
}
