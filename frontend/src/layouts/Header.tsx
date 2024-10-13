import React, { useEffect, useState } from "react";
import { Flex, Text, HStack, Box } from "@chakra-ui/react";
import { MdOutlineAccountBalanceWallet } from "react-icons/md";
import { ethers } from "ethers";

interface HeaderProps {
  walletAddress: string;
}

const Header: React.FC<HeaderProps> = ({ walletAddress }) => {
  const [balance, setBalance] = useState("0"); // Số dư của ví

  // Hàm để lấy số dư của địa chỉ ví
  const fetchBalance = async (address: string) => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(address);
        setBalance(ethers.utils.formatEther(balance)); // Chuyển đổi từ wei sang ETH
      } catch (error) {
        console.error("Error fetching balance:", error);
      }
    } else {
      console.error("MetaMask is not installed or accessible.");
    }
  };

  // Gọi hàm lấy số dư khi ví được kết nối
  useEffect(() => {
    if (walletAddress) {
      fetchBalance(walletAddress);
    }
  }, [walletAddress]); // Chạy lại khi địa chỉ ví thay đổi

  return (
    <Flex
      w="100%"
      justifyContent="center"
      alignItems="center"
      direction="column"
      mb={4}
    >
      {/* Hiển thị số dư và địa chỉ ví nếu đã kết nối */}
      {walletAddress && (
        <HStack spacing="20px" align="center">
          {/* Hiển thị số dư */}
          <Box display="flex" alignItems="center" bg="#000000" p={2} borderRadius="full" boxShadow="lg">
            <MdOutlineAccountBalanceWallet size={24} color="#FEDF56" />
            <Text ml={2} fontSize="md" color="#FEDF56">
              {Number(balance).toFixed(4)} ETH
            </Text>
          </Box>

          {/* Hiển thị địa chỉ ví */}
          <Box display="flex" alignItems="center" bg="#000000" p={2} borderRadius="full" boxShadow="lg">
            <MdOutlineAccountBalanceWallet size={24} color="#FEDF56" />
            <Text ml={2} fontSize="md" color="#FEDF56">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </Text>
          </Box>
        </HStack>
      )}
    </Flex>
  );
};

export default Header;
