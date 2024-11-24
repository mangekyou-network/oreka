import {
  createActor as createBinaryOptionMarketActor,
  canisterId as binaryOptionMarketCanisterId
} from "../declarations/binary_option_market"

import { AuthClient } from "@dfinity/auth-client";
import { HttpAgent } from "@dfinity/agent";

export const makeActor = async (canisterId, createActor) => {
  /*
  const authClient = await AuthClient.create();
  authClient.login({
    // 7 days in nanoseconds
    maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000),
    onSuccess: async () => {
      handleAuthenticated(authClient);
    },
  });
  const identity = await authClient.getIdentity();
  */

  return createActor(canisterId, {
    // agent: new HttpAgent({
    //   identity,
    // }),
    agentOptions: {
      host: process.env.NEXT_PUBLIC_IC_HOST
    }
  })
}

export function makeBinaryOptionMarketActor() {
  return makeActor(binaryOptionMarketCanisterId, createBinaryOptionMarketActor)
}
