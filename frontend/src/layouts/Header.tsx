import React, { useEffect, useState } from "react";
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
      w="100%"
      justifyContent="center"
      alignItems="center"
      direction="column"

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
          <Flex
            align="center"
            p={2}
            bg="#000000"
            borderRadius="full"
            boxShadow="lg"
            pl={3}
          >
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
    </Flex>
  );
}

export default Header;
