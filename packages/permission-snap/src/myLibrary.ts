import { z } from 'zod';
import { zSessionAccount, SessionAccount, zTypeDescriptor } from '../../../scripts/types.ts';

// We can locally define this however we want:
const zPermission = z.object({
  type: zTypeDescriptor,
});

type Permission = z.infer<typeof zPermission>;

const defaultPermissions = [
  {
    type: { name: 'Puddin' },
    data: {
      proof: `Oh, it's in here alright.`,
    }
  }
];

const createMyLibrary = async ({ registerPermission }: { registerPermission: (permission: any) => void }) => {

  // Here you could load from the network any additional permissions you need to register.
  // Call `registerPermission` with each permissions object you want to register.
  async function onInstall () {
    console.log('Permission snap registering initial permissions...')
    await Promise.all(defaultPermissions.map((permission) => {
      console.log('registering permission', permission);
      return registerPermission(permission);
    }))
    .catch((err) => {
      console.log('Problem registering permissions.', err);
    });
  }

  return {

    onInstall,

    onUpdate: null,

    serialize(permission: any) {
      return JSON.stringify(permission);
    },

    deserialize(permissionString: string) {
      // You can return rich objects here, you'll be passed them at the appropriate time.
      return JSON.parse(permissionString);
    },

    renderAttenuatorFor: (permission: any) => {
      switch (permission.type) {
        case 'Puddin':
          return panel([
            text('How many dollars worth of pudding?'),
            input({
              name: 'allowance',
              type: 'number',
              decimals: 2,
              placeholder: '240',
            }),
          ]);

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
              name: 'freeText',
              type: 'text',
              placeholder: '...',
            }),
          ]);
          
        default:
          // This would imply a kernel error, please let us know about it:
          throw new Error('Kernel Error: Requested attenuator not defined. Please inform MetaMask.');
      }
    },

    issuePermissionTo: async (permission: any, attenuatorResult: any, recipient: SessionAccount) => {
      return {
        sessionAccount: recipient,
        type: permission.type, // It's just parroting right now, not thinking.
        data: {
          caip10Address: 'placeholder-walderoo',
          foo: 'bar!', // Specific to the type that was requested.
        },
      };
    },

    validatePermission: (permission: Permission): boolean => {
      // Implement validation logic
      return true;
    },

    revokePermission: async (permissionId: string): Promise<void> => {
      // Implement revocation logic
      return;
    },

    renewPermission: async (permissionId: string, extension: number): Promise<void> => {
      // Implement renewal logic
      return;
    },

    listPermissionTypes: (): string[] => {
      // Implement logic to list available permission types
      return [];
    },

  };
};

export { createMyLibrary };