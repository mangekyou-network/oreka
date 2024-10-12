import { ethers } from "ethers";

// Hàm kết nối MetaMask và lấy địa chỉ ví
export const connectToMetaMask = async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts[0]; // Lấy địa chỉ ví đầu tiên
      return account; // Trả về địa chỉ ví
    } catch (error) {
      console.error("User rejected the request:", error);
      throw new Error("MetaMask connection rejected");
    }
  } else {
    alert("Please install MetaMask!");
    throw new Error("MetaMask not installed");
  }
};

// Hàm lấy số dư từ địa chỉ ví
export const fetchBalance = async (address) => {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const balanceInWei = await provider.getBalance(address); // Lấy số dư
    const balanceInEther = ethers.utils.formatEther(balanceInWei); // Chuyển đổi sang Ether
    return balanceInEther; // Trả về số dư
  } catch (error) {
    console.error("Error fetching balance:", error);
    throw new Error("Error fetching balance");
  }
};