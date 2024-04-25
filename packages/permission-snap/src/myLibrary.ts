import { z } from 'zod';
import { zSessionAccount, SessionAccount, zTypeDescriptor } from '../../../scripts/types.ts';
import { UserInputEventType, OnUserInputHandler, OnRpcRequestHandler, panel, heading, text, form, input, button } from '@metamask/snaps-sdk';

// We can locally define this however we want:
const zPermission = z.object({
  type: zTypeDescriptor,
  proposedName: z.string(),
  data: z.object({
    proof: z.string(),
  }),
});

type Permission = z.infer<typeof zPermission>;
const puddinType = {
  name: 'Puddin',
  description: 'The ability to dance with this much of your pudding',
}

const defaultPermissions = [
  {
    type: puddinType,
    proposedName: 'The Family Pile',
    data: {
      proof: `Oh, it's in here alright.`,
    }
  },
  {
    type: puddinType,
    proposedName: 'The Personal Stash',
    data: {
      proof: `Oh, it's in here alright.`,
    }
  },
  {
    type: puddinType,
    proposedName: 'The Company Jiggles',
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
      switch (permission.type.name) {
        case 'Puddin':
          return panel([
            heading('Puddin Permission'),
            text('How many dollars worth of pudding?'),
            input({
              name: 'allowance',
              type: 'number',
              placeholder: '240',
            }),
          ]);

        case 'erc20-token':
          return panel([
            heading('Token Allowance'),
            text('What is the maximum allowance to grant?'),
            input({
              name: 'allowance',
              type: 'number',
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
          return panel([
            heading('Unable to Protect'),
            text('We are not able to limit your exposure to this asset if you agree to grant it.'),
            text('Grant access to this asset to the requesting site anyway?'),
          ]);
      }
    },

    issuePermissionTo: async (permission: any, attenuatorResult: any, recipient: SessionAccount): PermissionsResponse => {
      return {
        submitToAddress: {
          caip10Address: 'MY-INVOKER-OR-ENTRYPOINT',
        },
        permissionsContext: 'THE-PUDDING-PROOF',

        grantedPolicy: {
          sessionAccount: recipient,
          type: permission.type, // It's just parroting right now, not thinking.
          data: {
            caip10Address: 'placeholder-walderoo',
            foo: 'bar!', // Specific to the type that was requested.
          },
        }
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