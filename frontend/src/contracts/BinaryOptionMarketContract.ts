import { ethers } from "ethers";
import { ILatestRound, IBidResult } from "../types";
import { OPTION_SIDE } from "./types"
import { BaseInterface } from "./interfaces";
import BINARY_OPTION_MARKET_ABI from "./abis/BinaryOptionMarketABI.json";

export class BinaryOptionMarketContract extends BaseInterface {
  constructor(provider: ethers.providers.Web3Provider, smAddress: string) {
    super(provider, smAddress, BINARY_OPTION_MARKET_ABI);
  }

  latestRoundDataAsync = async (): Promise<ILatestRound> => {
    const rs = await this._contract.latestRoundData();
    const decimals = await this._contract.decimals();

    return {
      answer: rs.answer
    };
  };

  bid = async (side: OPTION_SIDE, ethAmount: string): Promise<IBidResult> => {
    const rs = await this._contract.bid(side, { value: ethers.utils.parseEther(ethAmount) })

    return rs;
  }
}
