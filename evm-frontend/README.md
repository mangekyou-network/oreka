# Binary Option

This repository contains a simple binary option game utilizing Oreka Network Data Feeds.
Data feeds are deployed on Anvil Testnet, youd should add it to the wallet's networks config before running it.

## What is Binary Option Game?

"Binary Option" is a proof of concept betting game that utilizes price data submitted to Oreka Oracle Network.
Players start by get a simulated bidding of 100ETH, aiming to accurately predict the direction (up or down) of cryptocurrency price movement.
Or, you can use [this template](../contracts/BinaryOptionMarket.sol) to spin up your real Binary Option smart contract.

Correct predictions earn players 5 ETH while incorrect ones result in a loss of 5 ETH.
Asset prices are fetched from the [Exchange Rate Cannister](https://github.com/dfinity/exchange-rate-canister) and compared with the same asset's price after 30 seconds.
Users can select any supported data feed to participate in the game.

## Development

Start Anvil in the root repo

```
cd .. 
./deploy.sh
cd frontend/
```

Install dependencies.

```shell
yarn install
```

Next, you can start the frontend in a development mode.

```shell
yarn dev
```

Or you can build it first, and then launch in a production mode.

```shell
yarn build
yarn start
```

## License

[MIT License](LICENSE)
