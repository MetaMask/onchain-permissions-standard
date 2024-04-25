import styled from 'styled-components';
import { kernelSnapOrigin, accountSnapOrigin } from '../config';
import { Permission } from '../../../../scripts/types.ts';

import {
  ConnectButton,
  InstallFlaskButton,
  ReconnectButton,
  RequestPuddingProofButton,
  UsePuddingProofButton,
  Card 
 } from '../components';
import { defaultSnapOrigin } from '../config';
import {
  useMetaMask,
  useInvokeSnap,
  useMetaMaskContext,
  useRequestSnap,
} from '../hooks';
import { isLocalSnap, shouldDisplayReconnectButton } from '../utils';
import { useState } from 'react';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary?.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const Notice = styled.div`
  background-color: ${({ theme }) => theme.colors.background?.alternative};
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  color: ${({ theme }) => theme.colors.text?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;

  & > * {
    margin: 0;
  }
  ${({ theme }) => theme.mediaQueries.small} {
    margin-top: 1.2rem;
    padding: 1.6rem;
  }
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const Index = () => {
  const { error } = useMetaMaskContext();
  const { isFlask, snapsDetected, installedSnap, installedKernelSnap, installedAccountSnap } = useMetaMask();
  const requestKernelSnap = useRequestSnap(kernelSnapOrigin);
  const requestAccountSnap = useRequestSnap(accountSnapOrigin);
  const invokeKernelSnap = useInvokeSnap(kernelSnapOrigin);
  const invokeAccountSnap = useInvokeSnap(accountSnapOrigin);
  const [ puddingProof, setPuddingProof ] = useState(false);
  const [ usedProof, setUsedProof ] = useState(false);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? isFlask
    : snapsDetected;

  const handleSendHelloClick = async () => {
    await invokeKernelSnap({ method: 'hello' });
  };

  const requestPermission = async (permission: Permission) => {
    const result = await invokeKernelSnap({
      method: 'wallet_requestOnchainPermission',
      params: permission,
    });

    console.dir(result);
    if (result && result.grantedPolicy.type.name === 'Puddin') {
      setPuddingProof(result);
    } else {
      alert('Permission denied.');
    }
  }; 

  const handleRequestPermissionClick = async () => {
    return requestPermission({
      sessionAccount: {
        caip10Address: 'TODO_EMBEDDED_ACCOUNT',
      },
      type: {
        name: 'Puddin',
      },
      justification: `You don't need to worry about that... Shhhh...`,
    })
  };

  const handleUsePermissionClick = async () => {
    setUsedProof(true);
  };

  return (
    <Container>
      <Heading>
        Welcome to the <Span>Onchain Permissions Standard Snap Demo</Span>
      </Heading>
      <Subtitle>
        Try out a new way of interacting with web3.
      </Subtitle>
      <CardContainer>
        {error && (
          <ErrorMessage>
            <b>An error happened:</b> {error.message}
          </ErrorMessage>
        )}
        {!isMetaMaskReady && (
          <Card
            content={{
              title: 'Install',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!installedKernelSnap && (
          <Card
            content={{
              title: '1. Install Kernel',
              description:
                'Get started by installing the new permissions system.',
              button: (
                <ConnectButton
                  onClick={requestKernelSnap}
                  disabled={!isMetaMaskReady}
                />
              ),
            }}
            disabled={!isMetaMaskReady}
          />
        )}

      {installedKernelSnap && (
          <Card
            content={{
              title: '✅ 1. Reinstall Kernel',
              description:
                'Get started by installing the new permissions system.',
              button: (
                <ConnectButton
                  onClick={requestKernelSnap}
                  disabled={!isMetaMaskReady}
                />
              ),
            }}
            disabled={!isMetaMaskReady}
          />
        )}



       {!installedAccountSnap && (
          <Card
            content={{
              title: '2. Install New Account',
              description:
                'Second, install a new account type that knows how to use the permissions system.',
              button: (
                <ConnectButton
                  onClick={requestAccountSnap}
                  disabled={!isMetaMaskReady}
                />
              ),
            }}
            disabled={!isMetaMaskReady}
          />
        )}

        {!!installedAccountSnap && (
          <Card
            content={{
              title: '✅ 2: Reinstall Pudding Account',
              description:
                'Second, install a new account type that knows how to use the permissions system.',
              button: (
                <ConnectButton
                  onClick={requestAccountSnap}
                  disabled={!isMetaMaskReady}
                />
              )
            }}
          />
        )}
        
        {!puddingProof && (<Card
          content={{
            title: '3. Request Pudding Access',
            description:
              'Ask your wallet for pudding permission. More than just proof!',
            button: (
              <RequestPuddingProofButton onClick={handleRequestPermissionClick}
                disabled={!installedKernelSnap}
              />
            ),
          }}
          disabled={!installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(installedSnap) &&
            !shouldDisplayReconnectButton(installedSnap)
          }
        />)}

        {puddingProof && (<Card
          content={{
            title: '✅ 3. Re-Request Pudding Access',
            description:
              'Ask your wallet for pudding permission. More than just proof!',
            button: (
              <RequestPuddingProofButton onClick={handleRequestPermissionClick}
                disabled={!installedKernelSnap}
              />
            ),
          }}
          disabled={!installedSnap}
          fullWidth={
            isMetaMaskReady &&
            Boolean(installedSnap) &&
            !shouldDisplayReconnectButton(installedSnap)
          }
        />)}

        {!usedProof && (<Card
          content={{
            title: '4. Use Pudding',
            description:
              'Now the dapp can use the pudding without additional confirmations!',
            button: (
              <UsePuddingProofButton onClick={handleUsePermissionClick}
                disabled={!puddingProof}
              />
            ),
          }}
          disabled={!puddingProof}
          fullWidth={
            isMetaMaskReady &&
            Boolean(installedSnap) &&
            !shouldDisplayReconnectButton(installedSnap)
          }
        />)}
        {usedProof && (<Card
          content={{
            title: '✅ 4. Use Pudding',
            description:
              'Congratulations!',
            button: (
              <iframe width="560" height="315" src="https://www.youtube.com/embed/ikbPoVbOB_E?si=kxo_i_YPZ4vWovKO" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
            ),
          }}
          disabled={!puddingProof}
          fullWidth={
            isMetaMaskReady &&
            Boolean(installedSnap) &&
            !shouldDisplayReconnectButton(installedSnap)
          }
        />)}
        <Notice>
          <p>
            Please note that the <b>snap.manifest.json</b> and{' '}
            <b>package.json</b> must be located in the server root directory and
            the bundle must be hosted at the location specified by the location
            field.
          </p>
        </Notice>
      </CardContainer>
    </Container>
  );
};

export default Index;
