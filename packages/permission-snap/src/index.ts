/**
 * This is the entrypoint for a snap that handles permissions 
 * of some type, on some network(s) or ledger(s),
 * and wants to make those assets available to the user's discretion
 * when connecting to websites.
 * 
 * The goal of this file is to handle all the ugly parts
 * and some security critical parts
 * of interfacing with the snaps system,
 * so that smart contract developers
 * can fork this repository,
 * and may only need to edit `myLibrary.ts` (and `snap.manifest.json`).
 * 
 * This intents to allow any permission from any digital source
 * to be gathered into the user's MetaMask inventory
 * so those permissions can be more freely
 * and hopefully constructively interconnected around the web.
 * 
 * The permission system kernel is also implemented as a snap.
 * You can view its source code at `kernel-snap.ts`.
 */
console.log('before anything');
import { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text, form, input, button } from '@metamask/snaps-sdk';
import { createMyLibrary } from './myLibrary.ts'
const PERMISSIONS_SNAP_ID = '@metamask/onchain-permissions-kernel';
import { zPermissionsOffer, PermissionsOffer, zPermissionToGrantParams, PermissionToGrantParams } from '../../kernel-snap/src/index.ts';

console.log('Starting permission snap');

// IDs must be deterministic, so using a hash to start:
const permissionsMap: Map<string, Permission> = new Map();

type AccountSettings = {
  permissions: Array<unknown>,
}
const settings: AccountSettings = await getPersistedSettings() || createFreshSettings();


// Attn SCA devs:
// This is the library you implement for YOUR contract account.
// Feel free to just modify the example library!
console.log('Creating my library');
const myLibraryPromise = Promise.all(settings.permissions.map(async (permission) => {
  console.log('getting id');
  const permId = await getIdFor(permission);
  permissionsMap.set(permId, permission);
}))
.then(() => {
  return createMyLibrary({ registerPermission });
})
.catch((err) => {
  console.log('Problem initializing my library', err);
});

export const onInstall: OnInstallHandler = async () => {
  console.log('Permission snap install hook called.')
  const myLibrary = await myLibraryPromise;
  myLibrary && myLibrary.onInstall && myLibrary.onInstall();
};

export const onUpdate: OnUpdateHandler = async () => {
  const myLibrary = await myLibraryPromise;
  myLibrary && myLibrary.onUpdate && myLibrary.onUpdate();
};


async function getIdFor(permission) {
  const permissionString = JSON.stringify(permission);

  // Encode the text as a UTF-8 byte array
  const encoder = new TextEncoder();
  const data = encoder.encode(permissionString);

  // Hash the data with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert the hash to a hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

async function registerPermission (permission: Permission) {
  try {
    await snap.request({
      method: "wallet_requestSnaps",
      params: {
        "npm:@metamask/onchain-permissions-system": {},
      },
    });
    
    // Invoke the "hello" JSON-RPC method exposed by the Snap.
    const response = await snap.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: "npm:@metamask/onchain-permissions-system",
        request: {
          method: "wallet_registerAsset",
          params: permission,
        },
      },
    });
  } catch (err) {
    console.log('registering permission gave', err);
  }
}

async function getPersistedSettings () : AccountSettings {
  const persistedData = await snap.request({
    method: "snap_manageState",
    params: { operation: "get" },
  });
  return persistedData;
}

function createFreshSettings () : AccountSettings {
  return JSON.stringify({
    permissions: [],
  });
}

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {

  // Defer to the permissions kernel for all comms.
  // Rejecting all other messages.
  if (origin !== PERMISSIONS_SNAP_ID) {
    throw new UnauthorizedError(`Method ${request.method} not authorized for origin ${origin}.`);
  }

  // These are the internal methods that the permission system kernel requires.
  // The permission system kernel is responsible for handling the permissions request.
  switch (request.method) {
    case "permissionProvider_grantAttenuatedPermission":
      const grantParams: PermissionToGrantParams = zPermissionToGrantParams.parse(request.params);
      const { permissionId } = request.params;
      const permission = permissionsMap.get(permissionId);
      if (!permission) return false;
      const attenuatorUI = myLibrary.renderAttenuatorFor(permission);
      const interfaceId = await snap.request({
        method: 'snap_createInterface',
        params: {
          ui: form({
            name: 'attenuator-form',
            children:[
              text('Customize the permission before granting it to reduce your risk.'),
              attenuatorUI,
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

      console.log('Attenuator result:', result); // I suspect I'm guessing the response type wrong.
      const attenuatorResults = result['attenuator-form'];
      return myLibrary.issuePermissionTo(permission, attenuatorResults, grantParams.sessionAccount);

    // TODO: Add ERC-7679 support:
    case 'eth_sendBatchTransaction':

    // TODO?: Add classic account methods
    case 'eth_accounts':
    case 'eth_sendTransaction':
    case 'eth_personalSign':
    case 'eth_signTypedData':
    case 'eth_signTypedData_v1':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      throw new Error("Method not found");


    default:
      throw new Error("Method not found.");
  }
};