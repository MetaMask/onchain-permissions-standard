import { z } from 'zod';

// Onchain Permissions Standard interface
const PermissionsRequest = z.object({
  permissions: z.array(
    z.object({
      sessionAccount: z
        .object({
          caip10Address: z.string(),
        })
        .optional(),
      type: z.string(),
      data: z
        .object({
          caip10Address: z.string().optional(),
          limit: z.string().optional(),
        })
        .optional(),
      required: z.boolean(),
    }),
  ),
});

type PermissionsRequest = z.infer<typeof PermissionsRequest>;

type Permission = {
  type: string;
  methodName: string;
  data: Record<string, any>;
};
	
	permissions: [
		{

			sessionAccount?: {
				 // chainId is required for SCA accounts to work safely,
				 // and a SCA may specify an array of accepted chainIds:
				 caip10Address: "ethereum:0x....",
			},
			
		  // Permission is defined by the type of asset it permits moving:
			type: 'eth-dao-vote',
			
			// If excluded, the wallet MAY present the user with a token picker
			// The wallet may allow the user to add arbitrary additional constraints
			data?: {
				caip10Address?: "ethereum:0x....",
				limit?: "some number string",
			},
			required?: "false",
		},
	],
}

type PermissionsResponse = {

	// The response SHOULD repeat the request's sessionAccount values,
  // or if they were not included, MUST include an EOA sessionAccount for the requestor.
  // The signer can also refuse to respond to requests with no sessionAccount.
	sessionAccount: {...},
	
	grantedPolicies: {
		{
			
			type: 'erc20',
			data: {
				caip10Address: string,
				
				// Specific values describing the terms approved MAY be added by the signer
				// but may also be excluded, so the dapp SHOULD perform simulations to estimate
				// whether a given action is actually approved. 
				limit?: number,
			},
		},
	},

  // The address that can accept a `redeemDelegation` call on the user's behalf:
	submitToAddress: "0x...",
	
	// The bytes that encode the permission:
	permissionsContext: "some hex bytes",
	
	// Only needed if the account hasn't been deployed yet.
	// The DApp will set this data as the "initCode" field of the UserOp.
	// TODO: Refine this definition, since: 
	// A userOp's `initCode` is used for the caller, not an intermediate contract.
	initCode?: "0x...",
	
	// If UpgradeOps are provided, they MUST be sent to the user's account before
	// attempting performing the desired actions. This allows a non-deployed account
	// That is upgradable to also have its upgrade path be counterfactual.
	// TODO: Specify how these upgradeOps are submitted to the contract.
	upgradeOps?: ["0x...", "0x..."]
}

// Store for registered permission capabilities
const permissionCapabilities = new Map<string, Permission[]>();

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  switch (request.method) {
    case 'wallet_requestPermissions':
      // Validate the request against the schema
      const validatedRequest = PermissionsRequest.parse(request.params);

      // Filter and deduplicate permissions
      const relevantPermissions = validatedRequest.permissions.map(requestedPermission => {
        return [...permissionCapabilities.values()].flat().filter(storedPermission => 
          storedPermission.type === requestedPermission.type &&
          requestedPermission.data && 
          Object.entries(requestedPermission.data).every(([key, value]) =>
            storedPermission.data[key] === value  
          )
        );
      }).flat();

      const uniquePermissions = [...new Set(relevantPermissions.map(p => JSON.stringify(p)))].map(JSON.parse);

      if (uniquePermissions.length === 0) {
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
              ...uniquePermissions.map((permission, index) => 
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
      const selectedPermission = uniquePermissions[selectedIndex];

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
      const newPermissions = z.array(z.object({
        type: z.string(),
        methodName: z.string(),
        data: z.record(z.any()),
      })).parse(request.params);

      permissionCapabilities.set(origin, newPermissions);
      return true;

    default:
      throw new Error('Method not found.');
  }
};

