import { useState, useEffect, useRef } from "react";
import SocialLogin from "@biconomy/web3-auth";
import { ChainId } from "@biconomy/core-types";
import SmartAccount from "@biconomy/smart-account";
import Transak from "@biconomy/transak";
import { ethers } from "ethers";
import { css } from "@emotion/css";

export default function Auth() {
    const [smartAccount, setSmartAccount] = useState<SmartAccount | null>(null);
    const [interval, enableInterval] = useState<boolean>(false);
    const sdkRef = useRef<SocialLogin | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [balance, setBalance] = useState<string | null>(null);

    useEffect(() => {
        let configureLogin: any;
        if (interval) {
            configureLogin = setInterval(() => {
                if (!!sdkRef.current?.provider) {
                    setupSmartAccount();
                    clearInterval(configureLogin);
                }
            }, 1000);
        }

        if (smartAccount?.address) {
            getBalance().then(bal => setBalance(bal || null));
        }

    }, [smartAccount?.address, interval]);

    async function login() {
        if (!sdkRef.current) {
            const socialLoginSDK = new SocialLogin();
            const signature1 = await socialLoginSDK.whitelistUrl('https://biconomy-demo.app')
            const signature2 = await socialLoginSDK.whitelistUrl('http://localhost:3000')
            await socialLoginSDK.init({
                chainId: ethers.utils.hexValue(ChainId.POLYGON_MAINNET),
                whitelistUrls: {
                    "http://localhost:3000": signature2,
                    "https://biconomy-demo.vercel.app": signature1 //TODO: Add my demo link here
                },
            });
            sdkRef.current = socialLoginSDK;
        }
        if (!sdkRef.current.provider) {
            sdkRef.current.showWallet();
            enableInterval(true);
        } else {
            setupSmartAccount();
        }
    }

    async function setupSmartAccount() {
        if (!sdkRef?.current?.provider) return;
        setLoading(true);
        sdkRef.current.hideWallet();
        const web3Provider = new ethers.providers.Web3Provider(
            sdkRef.current.provider
        );
        try {
            const smartAccount = new SmartAccount(web3Provider, {
                activeNetworkId: ChainId.POLYGON_MAINNET,
                supportedNetworksIds: [ChainId.POLYGON_MAINNET],
            });
            await smartAccount.init();
            setSmartAccount(smartAccount);
            setLoading(false);
        } catch (error) {
            console.log("error setting up smart account ", error);
        }
    }

    const logout = async () => {
        if (!sdkRef.current) {
            console.error("Web3Modal not initialized");
            return;
        }
        await sdkRef.current.logout();
        sdkRef.current.hideWallet();
        setSmartAccount(null);
        enableInterval(false);
    };

    const onRamp = async () => {
        if (!smartAccount) return;
        console.log(smartAccount)
        // const transak = new Transak('STAGING', {
        //     walletAddress: smartAccount.address,
        // })
    }

    async function getBalance() {
        if (!!sdkRef?.current?.provider) {
            const provider = new ethers.providers.Web3Provider(sdkRef.current.provider);
            const address = smartAccount?.address;
            if (!address) return;
            if (typeof address == 'string') {
                const balance = await provider.getBalance(address);
                const balanceInEther = ethers.utils.formatEther(balance);
                return balanceInEther > String(0) ? balanceInEther : 'No Funds Available';
            }
        }
    }

    return (
        <div className={containerStyle}>
            <h1 className={headerStyle}>Your Account</h1>
            {!smartAccount && !loading && (
                <button className={buttonStyle} onClick={login}>
                    Login
                </button>
            )}
            {loading && <p>Loading Account Details</p>}
            {!!smartAccount && (
                <div className={detailsContainerStyle}>
                    <h3> Account Address:</h3>
                    <p>{smartAccount.address}</p>
                    <h3> Account Balance:</h3>
                    <p>{balance}</p>
                    <button className={buttonStyle} onClick={onRamp}>
                        Top-Up
                    </button>
                    <button className={buttonStyle} onClick={logout}>
                        Logout
                    </button>
                </div>
            )}
        </div>
    );
}

const detailsContainerStyle = css`
  margin-top: 10px;
`;

const buttonStyle = css`
  padding: 14px;
  width: 300px;
  border: none;
  cursor: pointer;
  border-radius: 999px;
  outline: none;
  margin-top: 20px;
  transition: all 0.25s;
  &:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }
`;

const headerStyle = css`
  font-size: 44px;
`;

const containerStyle = css`
  width: 900px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding-top: 100px;
`;
