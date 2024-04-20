import { z } from 'zod';

const PERMISSIONS_SNAP_ID = 'TODO_PLACEHOLDER';



const createMyLibrary = async (options) => {

  const { permissions }  = options;

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
        case "wallet_requestOnchainPermissions":
          return "world!";
    
        case "secureMethod":
          return "The secret is: 42";
    
        default:
          throw new Error("Method not found.");
      }
    };
  }

}

function initializePermission(permission) {

}

/* How a permission gets added internally
const ONE_WEEK = 7 * 24 * 60 * 1000; // ms
myLibrary.add([
  {
    metadata: {
      type: {
        name: 'erc20-token',
      },
    },
    renderAttenuator: () => {
      return panel([
        text('What is the maximum allowance to grant?'),
        input({
          name: 'allowance',
          type: 'number',
          decimals: 18,
          placeholder: '1',
        }),
        text('Expiration time?'),
        input({
          name: 'expiration',
          type: 'time',
          placeholder: Date.now() + ONE_WEEK,
        }),
        text('Anything else? Just for the record ;)'),
        input({
          name: 'llmInput',
          type: 'text',
          placeholder: Date.now() + ONE_WEEK,
        }),
      ]);
    },
    grantPermission: async (recipientAddress, attenuatorResponse) => {
      const { allowance, expiration }  = attenuatorResponse;
      return myLibrary.grantAllowance(recipientAddress, attenuatorResponse);
    },
  },
]);
*/

export createMyLibrary as createMyLibrary;

