import { z } from 'zod';


const createMyLibrary = async (options) => {

  const { permissions }  = options;

  return {
    renderAttenuatorFor: (objectId) => {
      const permission = permissionsMap.get(objectId);
      switch (permission.type) {
        case 'erc20-token':
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
          
          default:
            // This would imply a kernel error, please let us know about it:
            throw new Error('Kernel Error: Requested attenuator not defined. Please inform MetaMask.');
        }
      },
    }
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
      
    },
    grantPermission: async (recipientAddress, attenuatorResponse) => {
      const { allowance, expiration }  = attenuatorResponse;
      return myLibrary.grantAllowance(recipientAddress, attenuatorResponse);
    },
  },
]);
*/

export createMyLibrary as createMyLibrary;

