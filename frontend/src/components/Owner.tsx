import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Text, Button, VStack, useToast, Input, 
  HStack, Icon, SimpleGrid
} from '@chakra-ui/react';
import { FaEthereum, FaWallet, FaTrophy } from 'react-icons/fa';
import { ethers } from 'ethers';
import Factory from '../../../out/Factory.sol/Factory.json';  // ABI của Factory contract

const OwnerUI = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [strikePrice, setStrikePrice] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('');
  const [bytecode, setBytecode] = useState(Factory.bytecode);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const FactoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

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
        setBalance(balanceEth);
        setIsWalletConnected(true);
        
        toast({
          title: "Wallet connected successfully!",
          description: `Address: ${shortenAddress(address)}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
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
  const shortenAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // const bytecodetwo = Factory.bytecode;

  const deployContract = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const factoryContract = new ethers.Contract(FactoryAddress, Factory.abi, signer);
    
      // Salt ngẫu nhiên
      const randomSalt = ethers.utils.hexlify(ethers.utils.randomBytes(32));
      console.log('Random Salt:', randomSalt);
    
      // Kiểm tra bytecode
      console.log('Bytecode:', typeof bytecode, bytecode);  // Kiểm tra và in giá trị bytecode
      
      // Thêm bước xử lý bytecode
      let checkedBytecode = bytecode;
      
      if (typeof checkedBytecode !== 'string') {
        checkedBytecode = checkedBytecode.object;  // Nếu nó là một đối tượng, lấy thuộc tính chuỗi hex từ đó
      }
      
      // Đảm bảo rằng bytecode có tiền tố '0x'
      if (!checkedBytecode.startsWith('0x')) {
        checkedBytecode = '0x' + checkedBytecode;
      }
  
      // Kiểm tra lại bytecode cuối cùng
      if (typeof checkedBytecode !== 'string' || !checkedBytecode.startsWith('0x')) {
        throw new Error("Bytecode must be a valid hex string starting with '0x'");
      }
      
      // Triển khai hợp đồng với bytecode đã kiểm tra
      const tx = await factoryContract.deploy(ethers.utils.keccak256(randomSalt), checkedBytecode); // Sử dụng bytecode đã kiểm tra
      await tx.wait();
      
      // Lấy địa chỉ hợp đồng mới triển khai
      const deployedAddress = await factoryContract.getAddress(ethers.utils.keccak256(randomSalt), checkedBytecode);
      setContractAddress(deployedAddress);
      
      // Hiển thị thông báo
      toast({
        title: "Contract deployed successfully!",
        description: `Contract deployed at: ${deployedAddress}`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error("Error deploying contract:", error);
      toast({
        title: "Error deploying contract",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };
  

  // Chuyển đổi trạng thái từ Bidding sang Trading
  const startTrading = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const factoryContract = new ethers.Contract(FactoryAddress, Factory.abi, signer);

    await factoryContract.startTrading();
    toast({
      title: "Trading started!",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Chuyển đổi trạng thái từ Trading sang Maturity
  const resolveMarket = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const factoryContract = new ethers.Contract(FactoryAddress, Factory.abi, signer);

    await factoryContract.resolveMarket();
    toast({
      title: "Market resolved!",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Chuyển đổi trạng thái từ Maturity sang Expiry
  const expireMarket = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const factoryContract = new ethers.Contract(FactoryAddress, Factory.abi, signer);

    await factoryContract.expireMarket();
    toast({
      title: "Market expired!",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const abbreviateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <VStack 
    // width={{ base: '90%', md: '700px' }}
    // spacing={8}
    // align="stretch"
    color="#FEDF56"
    fontFamily="Arial, sans-serif">
      {/* Ẩn nút Connect nếu đã kết nối */}
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
              <Text>{abbreviateAddress(walletAddress)}</Text>
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
            onChange={(e) => setStrikePrice(e.target.value)}
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
          <Text color="white">Predicted Contract Address: {contractAddress}</Text>
        </Box>
      )}
    </VStack>
  );
};

export default OwnerUI;
