# Onchain Permissions Standard

This repository is a place for documenting and specifying the Onchain Permissions Standard, a next-generation interface for "wallets" that hold authority on decentralized cryptographic protocols to allow their users to safely and coherently interact with untrusted third parties, like websites.

This repository contains [MetaMask Snaps](https://snaps.metamask.io) example plugins for the [MetaMask](https://metamask.io) wallet:
- A `kernel-snap`, which accepts inbound requests from websites to request permissions, and allows other snaps to provide permissions.
- A `permission-snap`, which is a sample account snap that provides a few example permissions to the kernel, meant to be forked by account teams.

With the `kernel-snap` added to a [developer copy of MetaMask](https://metamask.io/flask), a developer can experiment with building their own account system directly into this permissions system within MetaMask, with the rest of the wallet UX provided. We hope this example code can be helpful to validate and "feel out" these APIs before they are escalated to consumer standards.

This repository is not yet working, but once it is, a sample application will be a simple proof.

## Workflow

1. The DApp sends `wallet_requestOnchainPermissions` with a program that we run in an isolated environment that
can customize the wallet experience.
  
## Types

Types are provided first in [zod](https://www.npmjs.com/package/zod), a JavaScript library that provides runtime type enforcement of inbound data (like comes from an untrusted source/website). Zod also provides `TypeScript` inference. Any LLM should be able to convert these to TypeScript if you prefer.

### `Address`

```typescript
export const zAddress = z.object({
  caip10Address: z.string(),
});

export type Address = z.infer(zAddress);
```

### `TypeDescriptor`

```typescript
export const zTypeDescriptor = z.object({
  name: z.string(),
});
```

### `RequestedPermission`

```typescript
export const zRequestedPermission = z.object({
  sessionAccount: zAddress,
  type: zTypeDescriptor,
  justification: z.string().optional(),
  data: z.object().optional(),
  required: z.boolean(),
});

export type Permission = z.infer(zRequestedPermission);
```

### `PermissionsRequest`

```typescript
export const zPermissionsRequest = z.object({
  permissions: z.array(zRequestedPermission),
});

export type PermissionsRequest = z.infer(zPermissionsRequest);
```

### `GrantedPolicy`

```typescript
export const zGrantedPolicy = z.object({
  sessionAccount: zAddress,
  type: zTypeDescriptor,
  data: z.object({
    caip10Address: z.string(),
    limit: z.number().optional(),
  }).optional(),
});
```

### `PermissionsResponse`

```typescript
export const zPermissionsResponse = z.object({
  grantedPolicy: zGrantedPolicy,
  submitToAddress: z.string(),
  permissionsContext: z.string(),
  initCode: z.string().optional(),
  upgradeOps: z.array(z.string()).optional(),
});

export type PermissionsResponse = z.infer(zPermissionsResponse);
```

## Snaps is pre-release software

To interact with (your) Snaps, you will need to install [MetaMask Flask](https://metamask.io/flask/),
a canary distribution for developers that provides access to upcoming features.

## Getting Started

Clone this repository and set up the development environment:

```shell
yarn install && yarn start
```

## Cloning

This repository contains GitHub Actions that you may find useful, see
`.github/workflows` and [Releasing & Publishing](https://github.com/MetaMask/onchain-permissions-standard/edit/main/README.md#releasing--publishing)
below for more information.

If you clone or create this repository outside the MetaMask GitHub organization,
you probably want to run `./scripts/cleanup.sh` to remove some files that will
not work properly outside the MetaMask GitHub organization.

If you don't wish to use any of the existing GitHub actions in this repository,
simply delete the `.github/workflows` directory.

## Contributing

### Testing and Linting

Run `yarn test` to run the tests once.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and
fix any automatically fixable issues.

### Using NPM packages with scripts

Scripts are disabled by default for security reasons. If you need to use NPM
packages with scripts, you can run `yarn allow-scripts auto`, and enable the
script in the `lavamoat.allowScripts` section of `package.json`.

See the documentation for [@lavamoat/allow-scripts](https://github.com/LavaMoat/LavaMoat/tree/main/packages/allow-scripts)
for more information.
