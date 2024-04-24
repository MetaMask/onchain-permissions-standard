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
import { UserInputEventType, OnUserInputHandler, OnRpcRequestHandler, panel, heading, text, form, input, button } from '@metamask/snaps-sdk';
import { createMyLibrary } from './myLibrary.ts'
const PERMISSIONS_SNAP_ID = 'local:http://localhost:8080';
import { zPermissionsOffer, PermissionsOffer, zPermissionToGrantParams, PermissionToGrantParams } from '../../kernel-snap/src/index.ts';

let attenuatorSelections = {};

console.log('Starting permission snap');

// IDs must be deterministic, so using a hash to start:
const permissionsMap: Map<string, Permission> = new Map();

type AccountSettings = {
  permissions: Array<unknown>,
}
const settings = {
  permissions: [],
};

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
  console.log('my library is ready, calling onInstall');
  if (myLibrary && myLibrary.onInstall) {
    myLibrary.onInstall();
  }
};

export const onUpdate: OnUpdateHandler = async () => {
  console.log('Permission snap onUpdate hook called');
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
    console.log('attempting to register', permission);
    const permId = await getIdFor(permission);
    permissionsMap.set(permId, permission);
    // Invoke the "hello" JSON-RPC method exposed by the Snap.
    const offer: PermissionsOffer = {
      id: permId,
      proposedName: 'The Giant Pile of Pudding',
      type: permission.type,
    }

    console.log('we have an offer', offer);
    const response = await snap.request({
      method: "wallet_invokeSnap",
      params: {
        snapId: PERMISSIONS_SNAP_ID,
        request: {
          method: "wallet_offerOnchainPermission",
          params: offer,
        },
      },
    });
  } catch (err) {
    console.log('registering permission gave', err);
  }
}

async function getPersistedSettings(): Promise<AccountSettings | null> {
  console.log('retrieving persisted state');
  try {
    const persistedData = await snap.request({
      method: "snap_manageState",
      params: { operation: "get" },
    });
    console.log('persisted state:', persistedData);
    return persistedData as AccountSettings;
  } catch (error) {
    console.error('Error retrieving persisted state:', error);
    return null;
  }
}

async function createFreshSettings(): Promise<AccountSettings> {
  console.log('creating fresh settings');
  return {
    permissions: [],
  };
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
  console.log('received method', request.method);
  // These are the internal methods that the permission system kernel requires.
  // The permission system kernel is responsible for handling the permissions request.
  switch (request.method) {
    case "permissionProvider_grantAttenuatedPermission":
      console.log('kernel requested permission approval', request.params);
      const grantParams: PermissionToGrantParams = zPermissionToGrantParams.parse(request.params);
      console.log('validated', grantParams);
      const { permissionId } = request.params;
      console.log('from permissions map', permissionsMap);
      const permission = permissionsMap.get(permissionId);
      if (!permission) return false;
      console.log('rendering attenuator ui...')
      const myLibrary = await myLibraryPromise;
      const attenuatorUI = myLibrary.renderAttenuatorFor(permission);
      console.log('attenuator ui rendered', attenuatorUI);
      const interfaceId = await snap.request({
        method: 'snap_createInterface',
        params: {
          ui: panel([
            heading('Customize Terms'),
            attenuatorUI,
          ]),
        },
      });

      await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'confirmation',
          id: interfaceId,
        },
      });

      const attenuatorResults = attenuatorSelections;
      console.log('Attenuator result:', attenuatorResults); // I suspect I'm guessing the response type wrong.
      const permissionsResponse: PermissionsResponse = myLibrary.issuePermissionTo(permission, attenuatorResults, grantParams.sessionAccount);
      console.log('response prepared', permissionsResponse);
      return permissionsResponse;

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

export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
  console.log('On user input called', { id, event });
  console.dir({ id, event });
  attenuatorSelections[event.name] = event.value;
};
