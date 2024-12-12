import { UP_DOWN_TYPE, OPTION_SIDE } from "../contracts/types";

export interface ILatestRound {
  answer: string;
  // answeredInRound: number;
  // roundId: number;
  // startedAt: number;
  // updatedAt: number;
}

export interface IItem {
  startAt: Date;
  price: number;
  yourPick: string;
}

export interface IWalletInfo {
  bnbBalance: number;
  address: string;
}

export interface IOptionModel {
  type: UP_DOWN_TYPE;
  amount: number;
}

export interface IBidOffer {
  side: OPTION_SIDE;
  amount: number;
}

export interface IBidResult {
  isSuccessful: boolean
}
