# AuctionQR Smart Contract

This repository contains the Anchor smart contract for a daily auction system.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Rust:** [https://www.rust-lang.org/tools/install](https://www.rust-lang.org/tools/install)
- **Solana CLI:** [https://docs.solana.com/cli/install](https://docs.solana.com/cli/install)
- **Node.js & Yarn:** [https://nodejs.org/](https://nodejs.org/) and `npm install -g yarn`
- **Anchor CLI (v0.31.1 or compatible):** `avm install 0.31.1` and `avm use 0.31.1`. We recommend using the Anchor Version Manager (`avm`). [https://www.anchor-lang.com/docs/installation](https://www.anchor-lang.com/docs/installation)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <YOUR_REPOSITORY_URL>
    cd auctionQR-SmartContract
    ```

2.  **Install Node.js dependencies:**
    ```bash
    yarn install
    ```

## Building the Smart Contract

The smart contract can be built for different Solana clusters (localnet, devnet, mainnet-beta).

1.  **Configure the target cluster:**
    Open the `Anchor.toml` file and locate the `[provider]` section. Change the `cluster` property to your desired network.

    **For Localnet:**
    ```toml
    [provider]
    cluster = "Localnet"
    wallet = "~/.config/solana/id.json"
    ```

    **For Devnet:**
    ```toml
    [provider]
    cluster = "Devnet"
    wallet = "~/.config/solana/id.json"
    ```

    **For Mainnet Beta:**
    ```toml
    [provider]
    cluster = "Mainnet"
    wallet = "~/.config/solana/id.json"
    ```

2.  **Build the contract:**
    Run the following command. This will compile the Rust code into a BPF bytecode file deployable on the Solana network.
    ```bash
    anchor build
    ```
    The output will be in the `target/` directory.

## Running Tests

To run the test suite against a local validator, use the following command. This will start a local validator, build and deploy the contract, and run the tests defined in the `tests/` directory.

```bash
anchor test
```

## Available Scripts

The `scripts/` directory contains several TypeScript files for interacting with the deployed smart contract:

-   `initialize.ts`: Initializes the auction state.
-   `start.ts`: Starts a new auction.
-   `bid.ts`: Places a bid on the current auction.
-   `end.ts`: Ends the current auction.
-   `eventListener.ts`: Listens for events emitted by the contract.
