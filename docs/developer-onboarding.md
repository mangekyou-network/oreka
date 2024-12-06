***Oreka Overview***

Oreka is a infrastructure for deploying prediction markets. Oreka provides oracle and smart contract templates to launch prediction markets, unified by a liquidity hub.

## Onboarding new developers
1. Basic understanding of Solidity
2. Learning [Git](https://www.youtube.com/watch?v=vQgcl8VouLU)
3. Implementing the Chainlink Oracle project with Solidity
- RWA (Real World Asset) using Chainlink (recommend watching Patrick Collins)
4. Learn [React](https://www.freecodecamp.org/news/free-react-course-2022/) and [React+Web3](https://www.youtube.com/watch?v=gyMwXuJrbJQ)
5. Understanding Oreka
- [Demo Video](https://www.youtube.com/watch?v=6q538lWfyao)
- [Pitch Deck Recording](https://drive.google.com/file/d/1kcrZHJYcmPUrkdDjJAJngaDGpoHAcRd5/view?usp=sharing)

6. Learning Motoko
- [Motoko by Example](https://github.com/dfinity/motoko-by-example)
- Deploy a simple motoko project on ICP

## Running Oreka

***Manual Setup***

Ensure the following are installed on your system:

-   [Node.js](https://nodejs.org/en/) `>= 21`
-   [Foundry](https://github.com/foundry-rs/foundry)
-   [Caddy](https://caddyserver.com/docs/install#install)
-   [DFX](https://internetcomputer.org/docs/current/developer-docs/build/install-upgrade-remove) `>= 0.18`

- Building oracle

```shell
git clone https://github.com/oreka-labs/oreka.git
cd oreka
./deploy.sh
```

- Running Front-End
```shell
cd ..
cd frontend
npm install
npm run dev
```



# Milestones

***Milestone 1***

- [ ] Make Oracle live 24/7 for retrieving WIF/USD pair, create the timers to call the `newJob()` frequently

- [ ] Integrating BinaryOptionMarket with the new oracle

- [ ] Adapt frontend to interact with the new BinaryOptionMarket, deploy to Vercel

Estimation: 15 days

***Milestone 2***

- [ ] Design and implement the motoko version of BinaryOptionMarket

Estimation: 25 days