import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Box, Button, Input, VStack, useToast, HStack, Icon, SimpleGrid, Text } from '@chakra-ui/react';
import { FaEthereum, FaWallet } from 'react-icons/fa';
import BinaryOptionMarket from '../../../out/BinaryOptionMarket.sol/BinaryOptionMarket.json';
import Factory from '../contracts/abis/FactoryABI.json';  // ABI của Factory contract

const Owner = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('');
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const FactoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const toast = useToast();  // Sử dụng useToast

  // Kết nối Metamask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        const balanceWei = await provider.getBalance(address);
        const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei));
        setWalletAddress(address);
        setBalance(balanceEth.toString());
        setIsWalletConnected(true);
        
        toast({
          title: "Wallet connected successfully!",
          description: `Address: ${shortenAddress(address)}`,
          variant: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error: any) {
        console.error("Failed to connect wallet:", error);
        toast({
          title: "Failed to connect wallet",
          description: error.message || "Please make sure MetaMask is installed and unlocked.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
    } else {
      toast({
        title: "MetaMask not detected",
        description: "Please install MetaMask to use this feature.",
        status: "warning",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Rút gọn địa chỉ ví
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Triển khai hợp đồng với CREATE2
  const deployContract = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const factoryContract = new ethers.Contract(FactoryAddress, Factory.abi, signer);

      // Salt ngẫu nhiên
      const randomSalt = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      
      // Triển khai hợp đồng
      const tx = await factoryContract.deploy(ethers.utils.keccak256(randomSalt), BinaryOptionMarket.bytecode, [walletAddress, strikePrice]);
      await tx.wait();

      // Lấy địa chỉ hợp đồng mới triển khai
      const deployedAddress = await factoryContract.getAddress(ethers.utils.keccak256(randomSalt));
      setContractAddress(deployedAddress);

      // Hiển thị thông báo
      toast({
        title: "Contract deployed successfully!",
        description: `Contract deployed at: ${deployedAddress}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Failed to deploy contract:", error);
      toast({
        title: "Failed to deploy contract",
        description: error.message || "An unexpected error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Chuyển đổi trạng thái từ Bidding sang Trading
  const startTrading = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const binaryOptionMarketContract = new ethers.Contract(contractAddress, BinaryOptionMarket.abi, signer);

      const tx = await binaryOptionMarketContract.startTrading();
      await tx.wait();

      toast({
        title: "Trading started!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Failed to start trading:", error);
      toast({
        title: "Failed to start trading",
        description: error.message || "An unexpected error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Chuyển đổi trạng thái từ Trading sang Maturity
  const resolveMarket = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const binaryOptionMarketContract = new ethers.Contract(contractAddress, BinaryOptionMarket.abi, signer);

      const tx = await binaryOptionMarketContract.resolveMarket();
      await tx.wait();

      toast({
        title: "Market resolved!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Failed to resolve market:", error);
      toast({
        title: "Failed to resolve market",
        description: error.message || "An unexpected error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Chuyển đổi trạng thái từ Maturity sang Expiry
  const expireMarket = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const binaryOptionMarketContract = new ethers.Contract(contractAddress, BinaryOptionMarket.abi, signer);

      const tx = await binaryOptionMarketContract.expireMarket();
      await tx.wait();

      toast({
        title: "Market expired!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Failed to expire market:", error);
      toast({
        title: "Failed to expire market",
        description: error.message || "An unexpected error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Cập nhật giá strike
  const updateStrikePrice = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const binaryOptionMarketContract = new ethers.Contract(contractAddress, BinaryOptionMarket.abi, signer);

      const tx = await binaryOptionMarketContract.setStrikePrice(strikePrice);
      await tx.wait();

      toast({
        title: "Strike price updated!",
        description: `New strike price: ${strikePrice}`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Failed to update strike price:", error);
      toast({
        title: "Failed to update strike price",
        description: error.message || "An unexpected error occurred.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <VStack 
    color="#FEDF56"
    fontFamily="Arial, sans-serif">
      {!isWalletConnected ? (
        <Button 
          onClick={connectWallet} 
          colorScheme="teal" 
          size="lg" 
          p={6}
          _hover={{ bg: "teal.500", transform: "scale(1.05)" }}>
            Connect Wallet
        </Button>
      ) : (
        <HStack spacing={4} justify="space-between" width="500px" color="#FF6B6B">
            <HStack>
              <Icon as={FaWallet} />
              <Text>{shortenAddress(walletAddress)}</Text>
            </HStack>
            <HStack>
              <Icon as={FaEthereum} />
              <Text>{parseFloat(balance).toFixed(4)} ETH</Text>
            </HStack>
          </HStack>
      )}

      <SimpleGrid columns={1}>
        <HStack spacing={6} my={8}>
          <Input
            placeholder="Strike Price"
            value={strikePrice}
            onChange={(e) => setStrikePrice(Number(e.target.value))}
            width={350}
            bg="gray.800"
            color="white"
            _placeholder={{ color: "gray.500" }}
          />
          <Button 
            onClick={deployContract} 
            colorScheme="pink" 
            size="lg" 
            _hover={{ bg: "pink.600", transform: "scale(1.05)" }}>
              Deploy Contract
          </Button>
        </HStack>
      </SimpleGrid>

      <SimpleGrid columns={3} spacing={20} my={8}>
        <Button 
          size="lg" 
          w="200px" 
          p={6} 
          colorScheme="purple"
          _hover={{ bg: "purple.600", transform: "scale(1.05)" }}
          onClick={startTrading}>
            Start Trading
        </Button>
        <Button 
          size="lg" 
          w="200px" 
          p={6} 
          colorScheme="blue"
          _hover={{ bg: "blue.600", transform: "scale(1.05)" }}
          onClick={resolveMarket}>
            Resolve
        </Button>
        <Button 
          size="lg" 
          w="200px" 
          p={6} 
          colorScheme="red"
          _hover={{ bg: "red.600", transform: "scale(1.05)" }}
          onClick={expireMarket}>
            Expire
        </Button>
      </SimpleGrid>

      {contractAddress && (
        <Box>
          <Text color="white">Contract Address: {contractAddress}</Text>
        </Box>
      )}
    </VStack>
  );
};

export default Owner;
