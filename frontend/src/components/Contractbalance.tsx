import React from "react";
import ethers from 'ethers';
import { useState , useEffect } from "react";
// New functionality: Get contract balance
const getContractBalance = async (contractAddress: any) => {
    try {
      // Lấy số dư của smart contract
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(contractAddress);
      return ethers.utils.formatEther(balance); // Chuyển đổi từ Wei sang Ether

    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0";
    }
  };

export default function ContractBalance({contractAddress}) {
    const [balance, setBalance] = useState("");

    useEffect(() => {
      const fetchBalance = async () => {
        const balanceInEther = await getContractBalance(contractAddress);
        setBalance(balanceInEther);
        console.log(balanceInEther);
      };

      fetchBalance();
      console.log(contractAddress);
    }, [contractAddress]);

    
    return (
      <div>
        <h1>Contract Balance: {balance} ETH</h1>
      </div>
    );
  }