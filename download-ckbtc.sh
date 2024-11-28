#!/bin/bash

# Download

DIR=target/ic

if [ ! -d "$DIR" ]; then
  mkdir "$DIR"
fi

IC_COMMIT="e6f76957a2b6e4ea01972798b04c87303e400a3f"

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-ckbtc-minter.wasm.gz -o "$DIR"/ckbtc_minter.wasm.gz
gunzip "$DIR"/ckbtc_minter.wasm.gz

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-ledger.wasm.gz -o "$DIR"/ckbtc_ledger.wasm.gz
gunzip "$DIR"/ckbtc_ledger.wasm.gz

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-icrc1-index.wasm.gz -o "$DIR"/ckbtc_index.wasm.gz
gunzip "$DIR"/ckbtc_index.wasm.gz

curl -sSL https://download.dfinity.systems/ic/$IC_COMMIT/canisters/ic-ckbtc-kyt.wasm.gz -o "$DIR"/ckbtc_kyt.wasm.gz
gunzip "$DIR"/ckbtc_kyt.wasm.gz

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/bitcoin/ckbtc/minter/ckbtc_minter.did -o "$DIR"/ckbtc_minter.did

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/rosetta-api/icrc1/ledger/ledger.did -o "$DIR"/ckbtc_ledger.did

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/rosetta-api/icrc1/index/index.did -o "$DIR"/ckbtc_index.did

curl -sSL https://raw.githubusercontent.com/dfinity/ic/$IC_COMMIT/rs/bitcoin/ckbtc/kyt/kyt.did -o "$DIR"/ckbtc_kyt.did