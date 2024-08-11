import { ethers } from "ethers";
import { ILatestRound } from "../types";
import { BaseInterface } from "./interfaces";
import AGGREGATOR_ABI from "./abis/AggregatorABI.json";

export class UpDownContract extends BaseInterface {
  constructor(provider: ethers.providers.Web3Provider, smAddress: string) {
    super(provider, smAddress, AGGREGATOR_ABI);
  }

  latestRoundDataAsync = async (): Promise<ILatestRound> => {
    const rs = await this._contract.latestRoundData();
    const decimals = await this._contract.decimals();

    return {
      answer: rs.answer
    };
  };
}
