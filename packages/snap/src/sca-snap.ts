/**
 * This is the entrypoint for a snap that handles permissions 
 * of some type, for some network,
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

import { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import { panel, text, form, input, button } from '@metamask/snaps-sdk';
import { createMyLibrary } from './createMyLibrary.ts'
const PERMISSIONS_SNAP_ID = 'TODO_PLACEHOLDER';

const permissionsMap: Map<string, Permission> = new Map();

// Persist some data.
await snap.request({
  method: "snap_manageState",
  params: { 
    operation: "update",
    newState: { hello: "world" },
  },
});


console.log(persistedData);
// { hello: "world" }

// If there's no need to store data anymore, clear it out.
await snap.request({
  method: "snap_manageState",
  params: { 
    operation: "clear",
  },
});

type AccountSettings = {
  permissions: Array<unknown>,
}
const permissions: AccountSettings = await getPersistedSettings() || createFreshSettings();

// Attn SCA devs:
// This is the library you implement for YOUR contract account.
// Feel free to just modify the example library!
const myLibrary = createMyLibrary({ permissions, registerPermission });

function async registerPermission (permission: Permission) {
  await window.ethereum.request({
    method: "wallet_requestSnaps",
    params: {
      "npm:@metamask/onchain-permissions-system": {},
    },
  });
  
  // Invoke the "hello" JSON-RPC method exposed by the Snap.
  const response = await window.ethereum.request({
    method: "wallet_invokeSnap",
    params: {
      snapId: "npm:@metamask/onchain-permissions-system",
      request: {
        method: "wallet_registerAsset",
        params: permission,
      },
    },
  });
}

export const onRpcRequest: OnRpcRequestHandler = accountKit.handler();

// TODO: Implement:
function getPersistedSettings () : AccountSettings {
  const persistedData = await snap.request({
    method: "snap_manageState",
    params: { operation: "get" },
  });
  return persistedData;
}

function createFreshSettings () : AccountSettings {
  return {
    permissions: [],
  }
}

return {
  handler: async ({
    origin,
    request,
  }) => {

    // Defer to the permissions kernel for all comms.
    if (origin !== PERMISSIONS_SNAP_ID) {
      throw new UnauthorizedError(`Method ${request.method} not authorized for origin ${origin}.`);
    }

    // These are the internal methods that the permission system kernel requires.
    // The permission system kernel is responsible for handling the permissions request.
    switch (request.method) {
      case "accountProvider_renderAttenuatorsFor":
        const { objectId } = request.params;
        return myLibrary.renderAttenuatorFor(objectId);;
  
      case "accountProvider_grantPermission":
        const { attenuatorResults, objectId }
        return myLibrary.grantPermission
 
      // TODO: Need a way for the account snap to register the permissions it has.        

      // TODO: Add ERC-7679 support:
      case 'eth_sendBatchTransaction':

      // TODO: Add classic account methods
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
}