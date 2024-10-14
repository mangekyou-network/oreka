// import { useEffect, useState } from 'react';
import { ethers } from "ethers";
import { ILatestRound, IBidResult } from "../types";
import { OPTION_SIDE } from "./types";


// import { BaseInterface } from "./interfaces";
// import BINARY_OPTION_MARKET_ABI from "./abis/BinaryOptionMarketABI.json";
// import ContractABI from "./abis/BinaryOptionMarketABI.json";
// import ContractBalance from '../components/Contractbalance';

  // Method to get the latest round data
  class BinaryOptionMarketContract {
    latestRoundDataAsync = async (): Promise<ILatestRound> => {
      try {
        const rs = await this._contract.latestRoundData();
        const decimals = await this._contract.decimals();
  
        return {
          answer: rs.answer,
          decimals: decimals,
        };
      } catch (error) {
        console.error("Error fetching latest round data:", error);
        throw error;
      }
    };
      // Method for placing a bid
    bid = async (side: OPTION_SIDE, ethAmount: string): Promise<IBidResult> => {
    try {
      const rs = await this._contract.bid(side, { value: ethers.utils.parseEther(ethAmount) });
      return rs;
    } catch (error) {
      console.error("Error placing a bid: ", error);
      throw new Error("Failed to place a bid. Please try again.");
    }
  };
  // Method for claiming rewards
  claimReward = async (): Promise<void> => {
    try {
      // Call the smart contract method to claim rewards
      const tx = await this._contract.claimReward();
      await tx.wait(); // Wait for the transaction to be mined
      console.log("Rewards claimed successfully!");
    } catch (error) {
      console.error("Error claiming rewards: ", error);
      throw new Error("Failed to claim rewards. Please try again.");
    }
  };
  // Method to select a coin
    // selectCoin = async (coinAddress: string): Promise<void> => {
    //   try {
    //     // Set the contract address to the selected coin
    //     this._contract = new ethers.Contract(coinAddress, BINARY_OPTION_MARKET_ABI, this._provider.getSigner());
    //     console.log(`Coin selected: ${coinAddress}`);
    //   } catch (error) {
    //     console.error("Error selecting coin: ", error);
    //     throw new Error("Failed to select coin. Please try again.");
    //   }
    // };
    // Method to start trading
  startTrading = async (side: OPTION_SIDE, ethAmount: string): Promise<void> => {
    try {
      // Ensure the required parameters are present
      if (!side || !ethAmount) {
        throw new Error("Invalid parameters. Make sure all fields are filled.");
      }

      // Place the bid based on the side (UP/DOWN) and the amount
      await this._contract.startTrading(side, ethAmount);
      console.log("Trading started successfully!");
    } catch (error) {
      console.error("Error starting trading: ", error);
      throw new Error("Failed to start trading. Please try again.");
    }
  };
  // Method to check if rewards are available
  checkRewardsAvailable = async (): Promise<boolean> => {
    try {
      const rewardsAvailable = await this._contract.rewardsAvailable();
      return rewardsAvailable;
    } catch (error) {
      console.error("Error checking rewards availability: ", error);
      throw new Error("Failed to check rewards. Please try again.");
    }
  };
  }
  

  

  
  

  

  

