# Easy Onramp Web3 Authentication 

This project provides a simple implementation for Web3 Account Abstraction & Social Login.

The example use case on display is a way to improve the UX for NFT Minting Sites to accommodate for Web2 Users & easily help them purchase NFTs.

This project is currently deployed on Polygon Mainnet.

## Key Libraries Used
- **@biconomy/web3-auth**: Biconomy's SDK for social login integration with web3 applications.
- **@biconomy/smart-account**: Biconomy's SDK for smart account management.
- **@biconomy/transak**: Transak API for seamless fiat-to-crypto transactions.
- **@biconomy/core-types**: Core types used in Biconomy SDKs.
- **ethers**: A complete Ethereum JavaScript library.
- **@emotion/css**: A powerful CSS-in-JS library.

## How It Works
1. A user clicks the Login button, which triggers the `login` function. This function initializes a new instance of SocialLogin and configures it with chain ID and whitelisted URLs.

2. After initialization, the function checks if a provider exists. If there isn't one, it opens the wallet selection UI. If a provider exists, it proceeds to set up the smart account.

3. The `setupSmartAccount` function is used to initialize the smart account, including setting up the provider, network ID, and finally setting the smart account state.

4. The `getBalance` function is used to fetch the balance of the connected account.

5. `onRamp` function is used to top-up funds in the account via Transak.

6. `buyItem` function is implemented to handle a simple purchase transaction. It initializes the contract and constructs a transaction. It checks the user's balance and handles the scenarios where the user has enough funds, some funds but not enough, and no funds.

7. A `logout` function is provided to enable users to disconnect their account.

## Installation
Before you can use this code in your project, make sure to install all necessary dependencies.

```bash
npm install @biconomy/web3-auth @biconomy/smart-account @biconomy/transak @biconomy/core-types ethers @emotion/css
