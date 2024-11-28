import {
  createActor as createBinaryOptionMarketActor,
  canisterId as binaryOptionMarketCanisterId,
} from "../declarations/binary_option_market"

import {
  createActor as createIcpLedgerActor,
  canisterId as icpLedgerCanisterId,
} from "../declarations/icp_ledger_canister"

import { AuthClient } from "@dfinity/auth-client";
import { Actor, HttpAgent, Identity } from "@dfinity/agent";

export const binaryOptionMarketActor = createBinaryOptionMarketActor(
  binaryOptionMarketCanisterId, {
  agentOptions: {
    host: process.env.NEXT_PUBLIC_IC_HOST
  }
});

export function setActorIdentity(identity: Identity) {
  (Actor.agentOf(binaryOptionMarketActor) as HttpAgent).replaceIdentity(identity);
}

export const icpLedgerCanister = createIcpLedgerActor(
  icpLedgerCanisterId, {
  agentOptions: {
    host: process.env.NEXT_PUBLIC_IC_HOST
  }
})

export function setIcpLedgerIdentity(identity: Identity) {
  (Actor.agentOf(icpLedgerCanister) as HttpAgent).replaceIdentity(identity);
}
