import { useState, useEffect, useRef } from "react";
import SocialLogin, { socialLoginSDK } from "@biconomy/web3-auth";
import { ChainId } from "@biconomy/core-types";
import SmartAccount from "@biconomy/smart-account";
import Transak from "@biconomy/transak";
import { ethers, providers } from "ethers";
import { css } from "@emotion/css";
import { address } from '../ethereum/address.js'
import abi from '../ethereum/abi.json'

export default function Auth() {
    const [smartAccount, setSmartAccount] = useState<SmartAccount | null>(null);
    const [interval, enableInterval] = useState<boolean>(false);
    const sdkRef = useRef<SocialLogin | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [balance, setBalance] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const price = ethers.utils.formatEther(1000000000000000);

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

    // Whitelist URLs
    const dev = 'http://localhost:3000'

    async function login() {
        setLoading(true);
        if (!sdkRef.current) {
            const socialLoginSDK = new SocialLogin();
            const signature1 = await socialLoginSDK.whitelistUrl('https://easyonramp.vercel.app')
            const devSig = await socialLoginSDK.whitelistUrl(dev)
            await socialLoginSDK.init({
                chainId: ethers.utils.hexValue(ChainId.POLYGON_MAINNET),
                whitelistUrls: {
                    'https://easyonramp.vercel.app': signature1,
                    dev: devSig
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

    /**
     * 
     * Currency Codes
     * 
     * ETH - Ethereum
     * MATIC - Polygon
     * BNB - Binance Smart Chain
     * USDC - USD Coin 
     * USDT - Tether 
     * 
     * Network Codes
     * 
     * ethereum
     * polygon
     * bsc
     * 
     */
    const onRamp = async () => {
        if (!smartAccount) return;
        const transak = new Transak('STAGING', {
            walletAddress: smartAccount.address,
            // cryptoCurrencyCode: 'USDC', 
            // network: 'ethereum',
            // defaultNetwork: 'ethereum',
            // themeColor: '000000',
            widgetWidth: '95%',
            isFeeCalculationHidden: 'true',
            exchangeScreenTitle: 'Top-Up',
            // hideMenu: 'true',
            // widgetHeight: '75%'
        })
        // FIAT On-Ramp Popup
        transak.init();
    }

    const buyItem = async () => {
        if (!smartAccount) return;
        if (!sdkRef.current) return;

        // Initialise Web3 Wallet Provider
        let provider
        if (!!sdkRef?.current?.provider) {
            provider = new ethers.providers.Web3Provider(sdkRef.current.provider);
        } else {
            alert('Please Login')
        }

        // Initialise NFT Contract & Create Transaction
        const contract = new ethers.Contract(address, abi, provider);
        const init = await contract.populateTransaction.mint(1)
        const tx = {
            to: address,
            data: init.data,
        }
        
        // Get Gas Price
        const feeAmounts = await smartAccount.getFeeQuotes({ transaction: tx }); // 0 represents native token
        const finalPrice = ethers.utils.parseEther(price).add(feeAmounts[0].tokenGasPrice)

        // Check if user has enough funds & store amount to top-up
        let topUp = false;
        let amountToTopUp;

        // If user has no funds, top-up with finalPrice
        // If user has some funds but not enough for mint, top-up with amountToTopUp
        // If user has enough funds, send transaction
        if (balance == null) {
            topUp = true;
            amountToTopUp = ethers.utils.formatEther(finalPrice)
        } else if (balance < String(ethers.utils.formatEther(finalPrice))) {
            topUp = true;
            amountToTopUp = ethers.utils.formatEther(Number(finalPrice) - Number(balance))
        } else {
            topUp = false;
        }

        // If user has enough funds, send transaction
        // If user does not have enough funds, top-up with amountToTopUp
        if (topUp == false) {
            const tx2 = await smartAccount.createUserPaidTransaction({
                transaction: tx,
                feeQuote: feeAmounts[0]
            });

            const receipt = smartAccount.sendUserPaidTransaction({
                tx: tx2,
                gasLimit: {
                    hex: "0xC3500",
                    type: "hex",
                }
            });
            console.log('receipt ', receipt)
            alert('Transaction Successful')
        } else {
            const transak = new Transak('STAGING', {
                walletAddress: smartAccount.address,
                network: 'polygon',
                widgetWidth: '95%',
                isFeeCalculationHidden: 'true',
                exchangeScreenTitle: 'Insufficient Balance! Please Top-Up',
                defaultCryptoAmount: amountToTopUp,
                cryptoCurrencyCode: 'MATIC',
            })
            // FIAT On-Ramp Popup
            transak.init();
        }
    }

    // TODO: Export Private Key
    // const exportPrivateKey = async () => {
    //     if (!smartAccount) return;
    //     if (!sdkRef.current) return;
    //     const privateKey = await socialLoginSDK.getPrivateKey()
    //     console.log('sdkRef ',sdkRef)
    //     console.log("private key ",privateKey);
    //     if (!privateKey) return;
    //     if (typeof privateKey == 'string') {setPrivateKey(privateKey);}
    // }

    return (
        <div className={containerStyle}>
            <h1 className={headerStyle}>Your Account</h1>
            {!smartAccount && !loading && (
                <button className={buttonStyle} onClick={login}>
                    Login
                </button>
            )}
            {loading && <p>Loading Account Details...</p>}
            {!!smartAccount && (
                <div className={detailsContainerStyle}>
                    <div className={infoContainerStyle}>
                        <h3>Account Address:</h3>
                        <p className={infoTextStyle}>{smartAccount.address}</p>
                    </div>
                    <div className={infoContainerStyle}>
                        <h3>Account Balance:</h3>
                        <p className={infoTextStyle}>{balance}</p>
                    </div>
                    <div className={infoContainerStyle}>
                        <h3>Item for Sale:</h3>
                        <img src="/nft.jpeg" style={{ maxWidth: '100%' }} />
                        <p className={infoTextStyle}>Item Price: {price} ETH</p>
                        <button className={buttonStyle} onClick={buyItem}>
                            Buy Item
                        </button>
                    </div>
                    <div className={buttonContainerStyle}>
                        <button className={buttonStyle} onClick={onRamp}>
                            Top-Up
                        </button>
                        <button className={buttonStyle} onClick={logout}>
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const detailsContainerStyle = css`
  margin-top: 1rem;
  background-color: #F3F3F3;
  padding: 0.5rem;
  border-radius: 5px;
  box-sizing: border-box;
`;

const buttonStyle = css`
  padding: 0.5rem;
  width: 100%;
  max-width: 100px;
  border: none;
  cursor: pointer;
  border-radius: 5px;
  outline: none;
  margin-bottom: 0.5rem;
  transition: all 0.25s;
  background-color: #4D4D4D;
  color: #FFFFFF;
  box-sizing: border-box;
  &:hover {
    background-color: #6D6D6D;
  }
`;

const headerStyle = css`
  font-size: 1.5rem;
  color: #4D4D4D;
  box-sizing: border-box;
`;

const containerStyle = css`
  width: 100%;
  max-width: 400px;
  margin: 0.5rem auto;
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 1rem;
  box-sizing: border-box;
`;

const infoContainerStyle = css`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border-bottom: 1px solid #E0E0E0;
  padding-bottom: 0.25rem;
  margin-bottom: 0.25rem;
  box-sizing: border-box;
  width: 100%;
`;

const infoTextStyle = css`
  color: #4D4D4D;
  font-size: 0.8rem;
  font-weight: 500;
  box-sizing: border-box;
`;

const buttonContainerStyle = css`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  width: 100%;
`;