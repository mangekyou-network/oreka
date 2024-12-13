Ethena USDe Prediction Market

## Deploy Contracts

```
# Install library
npm i
forge remappings
```

1. Replace .env.example with .env and add your private key

2. Replace the owner for the contract in the `script/Coprocessor.s.sol`:
```solidity
+ address ownerPublicKey = 0xAb251237210f6C2f7fAd53bE182E8bFdE2F628e0;
```
3. Forge
```
# deploy the contract on Sepolia
forge script script/Coprocessor.s.sol:MyScript --rpc-url https://eth-sepolia.g.alchemy.com/v2/SEem2zNMKSjcqvIsS9gm-_Lw9V5_Ckra --broadcast --sig "run()"
```
```
# start the contract
cast send $EVM_ADDRESS "startTrading()" --rpc-url https://eth-sepolia.g.alchemy.com/v2/SEem2zNMKSjcqvIsS9gm-_Lw9V5_Ckra --private-key $PRIVATE_KEY
```

4. Replace the new address in the `frontend/src/configs/constants.ts`


## Frontend 

```
cd frontend
npm i --legacy-peer-deps
npm run dev
```
