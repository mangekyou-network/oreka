# Chain Fusion Starter Project

![Chain Fusion Hero](https://github.com/letmejustputthishere/chain-fusion-starter/assets/32162112/e787cf9c-0bfc-4ce3-8211-8df61cf06a0b)

## Getting Started

To deploy the project locally, run `./deploy.sh` from the project root. This script will:

-   Start `anvil`
-   Start `dfx`
-   Deploy the EVM contract
-   Generate a number of jobs to be processed
-   Deploy the coprocessor canister

Check the `deploy.sh` script comments for detailed deployment steps.

### In the Cloud

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/letmejustputthishere/chain-fusion-starter/?quickstart=1)

### Locally

Ensure Docker and VS Code are installed and running, then click the button below:

[![Open locally in Dev Containers](https://img.shields.io/static/v1?label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/letmejustputthishere/chain-fusion-starter)

Run these commands in a new, empty project directory:

```sh
git clone https://github.com/letmejustputthishere/chain-fusion-starter.git
cd chain-fusion-starter
```

## Architecture

This starter project involves multiple canisters working together to process events emitted by an EVM smart contract. The contracts involved are:

-   **EVM Smart Contract**: Emits events such as `NewJob` when specific functions are called. It also handles callbacks from the `chain_fusion` canister with the results of the processed jobs.
-   **Chain Fusion Canister (`chain_fusion`)**: Listens to events emitted by the EVM smart contract, processes them, and sends the results back to the EVM smart contract.
-   **EVM RPC Canister**: Facilitates communication between the Internet Computer and EVM-based blockchains by making RPC calls to interact with the EVM smart contract.

The full flow of how these canisters interact can be found in the following sequence diagram:

<p align="center">
<img src="https://github.com/letmejustputthishere/chain-fusion-starter/assets/32162112/22272844-016c-43a0-a087-a861e930726c" height="600">
</p>

### EVM Smart Contract

The `contracts/Coprocessor.sol` contract emits a `NewJob` event when the `newJob` function is called, transferring ETH to the `chain_fusion` canister to pay it for job processing and transaction fees (this step is optional and can be customized to fit your use case).

```solidity
// Function to create a new job
function newJob() public payable {
    // Require at least 0.01 ETH to be sent with the call
    require(msg.value >= 0.01 ether, "Minimum 0.01 ETH not met");

    // Forward the ETH received to the coprocessor address
    // to pay for the submission of the job result back to the EVM
    // contract.
    coprocessor.transfer(msg.value);

    // Emit the new job event
    emit NewJob(job_id);

    // Increment job counter
    job_id++;
}
```

The `callback` function writes processed results back to the contract:

```solidity
function callback(string calldata _result, uint256 _job_id) public {
    require(
        msg.sender == coprocessor,
        "Only the coprocessor can call this function"
    );
    jobs[_job_id] = _result;
}
```

For local deployment, see the `deploy.sh` script and `script/Coprocessor.s.sol`.

### Chain Fusion Canister

The `chain_fusion` canister listens to `NewJob` events by periodically calling the `eth_getLogs` RPC method via the [EVM RPC canister](https://github.com/internet-computer-protocol/evm-rpc-canister). Upon receiving an event, it processes the job and sends the results back to the EVM smart contract via the EVM RPC canister, signing the transaction with threshold ECDSA.

The Job processing logic is in `canisters/chain_fusion/src/job.rs`:

```rust
pub async fn job(event_source: LogSource, event: LogEntry) {
    mutate_state(|s| s.record_processed_log(event_source.clone()));
    // because we deploy the canister with topics only matching
    // NewJob events we can safely assume that the event is a NewJob.
    let new_job_event = NewJobEvent::from(event);
    // this calculation would likely exceed an ethereum blocks gas limit
    // but can easily be calculated on the IC
    let result = fibonacci(20);
    // we write the result back to the evm smart contract, creating a signature
    // on the transaction with chain key ecdsa and sending it to the evm via the
    // evm rpc canister
    submit_result(result.to_string(), new_job_event.job_id).await;
    println!("Successfully ran job #{:?}", &new_job_event.job_id);
}
```

## Development

All coprocessing logic resides in `canisters/chain_fusion/src/job.rs`. Developers can focus on writing jobs to process EVM smart contract events without altering the code for fetching events or sending transactions.

### Interacting with the EVM Smart Contract

If you want to check that the `chain_fusion` canister really processed the events, you can either look at the logs output by running `./deploy.sh` – keep an eye open for the `Successfully ran job` message – or you can call the EVM contract to get the results of the jobs. To do this, run:

```sh
cast call 0x5fbdb2315678afecb367f032d93f642f64180aa3 "getResult(uint)(string)" <job_id>
```

where `<job_id>` is the ID of the job you want to get the result for. This should always return `"6765"` for processed jobs, which is the 20th Fibonacci number, and `""` for unprocessed jobs.

If you want to create more jobs, simply run:

```sh
cast send 0x5fbdb2315678afecb367f032d93f642f64180aa3 "newJob()" --private-key=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --value 0.01ether
```

Note that the Chain Fusion Canister only scrapes logs every 3 minutes, so you may need to wait a few minutes before seeing the new job processed.

### Leveraging `storage.rs` for Stable Memory

The `storage.rs` module allows you to store data in stable memory, providing up to 400 GiB of available storage. In this starter template, stable memory can used to store assets that can then be served via HTTP.

To use this feature, you need to uncomment the section in `lib.rs` that handles HTTP requests. This enables the canister to serve stored assets. Here is the code snippet to uncomment:

```rust
// Uncomment this if you need to serve stored assets from `storage.rs` via HTTP requests

// #[ic_cdk::query]
// fn http_request(req: HttpRequest) -> HttpResponse {
//     if let Some(asset) = get_asset(&req.path().to_string()) {
//         let mut response_builder = HttpResponseBuilder::ok();

//         for (name, value) in asset.headers {
//             response_builder = response_builder.header(name, value);
//         }

//         response_builder
//             .with_body_and_content_length(asset.body)
//             .build()
//     } else {
//         HttpResponseBuilder::not_found().build()
//     }
// }
```

By enabling this code, you can serve web content directly from the canister, leveraging the stable memory for storing large amounts of data efficiently.

### Reading from and writing to EVM Smart Contracts

To send transactions to the EVM, this project uses the [`ic-evm-utils`](https://crates.io/crates/ic-evm-utils) crate. This crate provides functionality for constructing, signing and sending transactions to EVM networks, leveraging the [`evm-rpc-canister-types`](https://crates.io/crates/evm-rpc-canister-types) crate for data types and constants.

#### Key Functions:

-   **sign_eip1559_transaction**: This function signs a EIP-1559 transaction.

-   **eth_call**: This function sends a call to an arbitrary EVM smart contract to read data from it. It constructs a JSON-RPC call to the EVM RPC canister, which then forwards the call to the EVM smart contract.

-   **erc20_balance_of**: The `erc20_balance_of` function demonstrates how to construct and send a call to an ERC20 contract to query the balance of a specific address. It uses the `eth_call` function to send the call and parse the response. You can refer to the `erc20_balance_of` function in the `eth_call.rs` module to understand how to implement similar read operations for other types of EVM smart contracts.

-   **send_raw_transaction**: This function sends a raw transaction to an EVM smart contract. It constructs a transaction, signs it with the canister's private key, and sends it to the EVM network.

-   **transfer_eth**: The `transfer_eth` function demonstrates how to transfer ETH from a canister-owned EVM address to another address. It covers creating a transaction, signing it with the canister's private key, and sending it to the EVM network. `transfer_eth` uses the `send_raw_transaction` function to send the transaction.

-   **contract_interaction**: The `contract_interaction` function demonstrates how to interact with arbitrary EVM smart contracts. It constructs a transaction based on the desired contract interaction, signs it with the canister's private key, and sends it to the EVM network. `contract_interaction` uses the `send_raw_transaction` function to send the transaction. The `submit_result` function in this starter project leverages this function to send the results of processed jobs back to the EVM smart contract.
