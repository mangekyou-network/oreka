import React, { useEffect, useState } from "react";
import ethers from 'ethers';

// Định nghĩa kiểu cho props
interface ContractBalanceProps {
  contractAddress: string; // Địa chỉ hợp đồng phải là một chuỗi
}

// Hàm để lấy số dư của hợp đồng
const getContractBalance = async (contractAddress: string) => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const balance = await provider.getBalance(contractAddress);
    return ethers.utils.formatEther(balance); // Chuyển đổi từ Wei sang Ether
  } catch (error) {
    console.error("Error fetching balance:", error);
    return "0";
  }
};

const ContractBalance: React.FC<ContractBalanceProps> = ({ contractAddress }) => {
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
};

export default ContractBalance;