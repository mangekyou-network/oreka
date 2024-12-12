import { createReducer } from "@reduxjs/toolkit";
import { ethers } from "ethers";
import { IItem, IWalletInfo } from "../../types";

import {
  generateContract,
  logoutAction,
  setPickItemAction,
  setProvider,
  startResultAction,
} from "./account.actions";

export const DEFAULT_MES = "Something error!";

export interface AccountState {
  web3Provider?: ethers.providers.Web3Provider;
  walletInfo: IWalletInfo;
  point: number;
  picks: IItem[];
}

const initialState: AccountState = {
  walletInfo: {
    address: "",
    bnbBalance: 0,
  },
  point: 100,
  picks: [],
};

export const accountReducer = createReducer(initialState, (builder) => {
  builder.addCase(setProvider, (state, { payload }) => {
    state.web3Provider = payload;
  });

  builder.addCase(generateContract.fulfilled, (state, { payload }) => {
    state.walletInfo = payload;
  });

  builder.addCase(startResultAction, (state, {payload}) => {
    const { point } = state;
    if (point < 5) return;
    state.point = point + payload;
  });

  builder.addCase(setPickItemAction, (state, {payload}) => {
    const {picks} = state;
    state.picks = [payload, ...picks]
  })

  // logout
  builder.addCase(logoutAction, (state) => {
    Object.assign(state, initialState);
  });
});
