import React, { useEffect, useState } from "react";
<<<<<<< HEAD
import { Flex, Text, HStack } from "@chakra-ui/react";
import { MdOutlineAccountBalanceWallet } from "react-icons/md";
import { ethers } from "ethers";

function Header({ walletAddress }: { walletAddress: string }) {
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
=======
import { Flex, Box, Text, Button, HStack } from "@chakra-ui/react";
import { connectToMetaMask, fetchBalance } from "../utils/WalletService";
import { SMART_CONTRACT_ADDRESS } from "../configs/constants";
import { MdOutlineAccountBalanceWallet } from "react-icons/md"; // Import icon từ react-icons

function Header() {
  const [walletAddress, setWalletAddress] = useState(""); 
  const [balance, setBalance] = useState("0"); 

  const handleConnect = async () => {
    try {
      const account = await connectToMetaMask();
      setWalletAddress(account);
      const balance = await fetchBalance(SMART_CONTRACT_ADDRESS);
      setBalance(balance);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Flex
      flex={1}
>>>>>>> ed46c85787db75fda29120611b0fad0b6462daae
      w="100%"
      justifyContent="center"
      alignItems="center"
      direction="column"
<<<<<<< HEAD
    >
      {/* Hiển thị số dư và địa chỉ ví nếu đã kết nối */}
      {walletAddress && (
        <HStack spacing="20px" mt="30px" align="center">
          <Flex
            align="center"
            p={2}
            bg="#000000"
            borderRadius="full"
            boxShadow="lg"
            pl={3}
          >
            <MdOutlineAccountBalanceWallet size={24} color="#FEDF56" />
            <Text ml={2} fontSize="md" color="#FEDF56">
              {balance} ETH
            </Text>
          </Flex>

=======
      mt={2}
    >
      <Button
        onClick={handleConnect}
        bg="#FFA500"
        color="#000000"
        _hover={{ bg: "#FF8C00" }}
        mt={2}
        mb={3}
      >
        Connect MetaMask
      </Button>

      <HStack spacing={3} mt={2} align="center"> 
        {walletAddress && (
>>>>>>> ed46c85787db75fda29120611b0fad0b6462daae
          <Flex
            align="center"
            p={2}
            bg="#000000"
            borderRadius="full"
            boxShadow="lg"
            pl={3}
          >
<<<<<<< HEAD
            <MdOutlineAccountBalanceWallet size={24} color="#FEDF56" />
            <Text ml={2} fontSize="md" color="#FEDF56">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </Text>
          </Flex>
        </HStack>
      )}
=======
            <MdOutlineAccountBalanceWallet size={24} color="#FFFFFF" /> {/* Sử dụng icon từ react-icons */}
            <Text ml={2} fontSize="md" color="#FFFFFF">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </Text>
          </Flex>
        )}

        {walletAddress && (
          <Flex
            align="center"
            p={2}
            bg="#000000"
            borderRadius="full"
            boxShadow="lg"
            pl={3}
          >
            <MdOutlineAccountBalanceWallet size={24} color="#FFFFFF" />
            <Text ml={2} fontSize="md" color="#FFFFFF">
              {balance} ETH
            </Text>
          </Flex>
        )}
      </HStack>
>>>>>>> ed46c85787db75fda29120611b0fad0b6462daae
    </Flex>
  );
}

export default Header;
