import React, { useEffect, useState } from "react";
import { Flex, Box, Text, Button, HStack } from "@chakra-ui/react";
import { connectToMetaMask, fetchBalance } from "../utils/WalletService";
import { SMART_CONTRACT_ADDRESS } from "../configs/constants";
import { MdOutlineAccountBalanceWallet } from "react-icons/md";

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
      mt={-40}
    >
      {!walletAddress && ( // Chỉ hiển thị nút nếu chưa kết nối ví
        <Button
          onClick={handleConnect}
          bg="#FFA500"
          color="#000000"
          _hover={{ bg: "#FF8C00" }}
          mt={200}
          mb={3}
        >
          Connect MetaMask
        </Button>
      )}

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
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </Text>
          </Flex>

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
        </HStack>
      )}
    </Flex>
  );
}

export default Header;
