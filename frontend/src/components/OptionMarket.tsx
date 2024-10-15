import React, { useState, useEffect, useRef } from 'react';
import { 
  Flex, Box, Text, Button, VStack, useToast, Input, 
  Select, HStack, Icon, ScaleFade, Table, Thead, Tbody, Tr, Th, Td, SimpleGrid
} from '@chakra-ui/react';
import { FaEthereum, FaWallet, FaTrophy } from 'react-icons/fa';
import { ethers } from 'ethers';
import { motion, useAnimation } from 'framer-motion';
import { SMART_CONTRACT_ADDRESS } from '../configs/constants';

enum Side { Long, Short }
enum Phase { Bidding, Trading, Maturity, Expiry }

interface Coin {
  value: string;
  label: string;
}

function OptionMarket() {
  const [contract, setContract] = useState<any>(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [balance, setBalance] = useState(0);
  const [accumulatedWinnings, setAccumulatedWinnings] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [currentPhase, setCurrentPhase] = useState<Phase>(Phase.Bidding);
  const [positions, setPositions] = useState({ long: 0, short: 0 });
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [strikePrice, setStrikePrice] = useState<number>(100);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [isResolved, setIsResolved] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [userRole, setUserRole] = useState('');
  const [availableCoins] = useState<Coin[]>([
    { value: "0x5fbdb2315678afecb367f032d93f642f64180aa3", label: "WIF/USD" },
    { value: "0x6fbdb2315678afecb367f032d93f642f64180aa3", label: "ETH/USD" },
    { value: "0x7fbdb2315678afecb367f032d93f642f64180aa3", label: "BTC/USD" }
  ]);

  const toast = useToast();
  const priceControls = useAnimation();
  const currentPriceRef = useRef(strikePrice);

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
        setIsLoggedIn(true);
  
        // Kiểm tra vai trò người dùng
        if (address.toLowerCase() === SMART_CONTRACT_ADDRESS.toLowerCase()) {
          setUserRole('owner');
        } else {
          setUserRole('customer');
        }
  
        toast({
          title: "Wallet connected successfully!",
          description: `Address: ${abbreviateAddress(address)}`,
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
  

  const handleCoinSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = availableCoins.find(coin => coin.value === event.target.value);
    if (selected) {
      setSelectedCoin(selected);
      resetMarket();
    }
  };

  const handleBid = async (side: Side) => {
    if (!bidAmount || Number(bidAmount) <= 0) return;
    
    const bidAmountNumber = Number(bidAmount);
    
    if (bidAmountNumber > balance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough ETH to place this bid.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setBalance(prev => prev - bidAmountNumber);
      setPositions(prev => ({
        ...prev,
        [Side[side].toLowerCase()]: prev[Side[side].toLowerCase()] + bidAmountNumber
      }));
      setTotalDeposited(prev => prev + bidAmountNumber);
      
      // Simulate market resolution
      const simulatedFinalPrice = Math.random() * 200;
      setFinalPrice(simulatedFinalPrice);

      // Start countdown
      for (let i = 5; i > 0; i--) {
        setCountdown(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setCountdown(null);

      // Immediately change price after countdown
      currentPriceRef.current = Number(simulatedFinalPrice.toFixed(2));
      setIsResolved(true);
      setCurrentPhase(Phase.Expiry);

      // Change color based on price movement
      await priceControls.start({
        opacity: 1,
        color: simulatedFinalPrice > strikePrice ? "#00FF00" : "#FF0000",
        transition: { duration: 0.1 }
      });

      const won = (side === Side.Long && simulatedFinalPrice > strikePrice) ||
                  (side === Side.Short && simulatedFinalPrice < strikePrice);
      
      if (won) {
        const winnings = bidAmountNumber * 2; // Simple 2x reward for demo
        setAccumulatedWinnings(prev => prev + winnings);
        setResultMessage("YOU WIN");
      } else {
        setResultMessage("YOU LOSE");
      }
      setShowResult(true);

      setTimeout(() => {
        setShowResult(false);
      }, 2000);
      
      setBidAmount("");

      // Automatically start a new round after a short delay
      setTimeout(() => {
        resetMarket();
      }, 3000);
    } catch (error) {
      console.error("Error placing bid:", error);
      toast({
        title: "Error placing bid",
        description: "An unexpected error occurred. Please try again.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const resetMarket = () => {
    setPositions({ long: 0, short: 0 });
    setTotalDeposited(0);
    const newStrikePrice = Number((Math.random() * 100 + 50).toFixed(2)); // Random strike price between 50 and 150
    setStrikePrice(newStrikePrice);
    currentPriceRef.current = newStrikePrice;
    setFinalPrice(0);
    setIsResolved(false);
    setCurrentPhase(Phase.Bidding);
    priceControls.set({ opacity: 1, color: "#FEDF56" });
  };

  const abbreviateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const claimWinnings = () => {
    setBalance(prev => prev + accumulatedWinnings);
    setAccumulatedWinnings(0);
    toast({
      title: "Winnings claimed!",
      description: `${accumulatedWinnings.toFixed(4)} ETH added to your balance.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  const handleStartTrading = async () => {
    if (contract) {
      console.log("Contract is initialized:", contract);
      try {
        await contract.startTrading();
        toast({
          title: "Trading started successfully!",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        console.error("Error starting trading:", error);
        toast({
          title: "Error",
          description: "Failed to start trading. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else {
      console.error("Contract is not initialized");
    }
  };
  

  const handleResolve = async () => {
    if (contract) {
      try {
        await contract.resolve();
        toast({
          title: "Trading resolved successfully!",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to resolve trading. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleExpire = async () => {
    if (contract) {
      try {
        await contract.expire();
        toast({
          title: "Option expired successfully!",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to expire option. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  return (
    <Flex direction="column" alignItems="center" justifyContent="flex-start" p={6} bg="black" minH="100vh" position="relative">
      <VStack
        width={{ base: '90%', md: '700px' }}
        spacing={8}
        align="stretch"
        color="#FEDF56"
        fontFamily="Arial, sans-serif"
      >
        {isLoggedIn && (
          <HStack spacing={4} justify="space-between" width="100%">
            <HStack>
              <Icon as={FaWallet} />
              <Text>{abbreviateAddress(walletAddress)}</Text>
            </HStack>
            <HStack>
              <Icon as={FaEthereum} />
              <Text>{balance.toFixed(4)} ETH</Text>
            </HStack>
            <HStack>
              <Icon as={FaTrophy} />
              <Text>{accumulatedWinnings.toFixed(4)} ETH</Text>
              {accumulatedWinnings > 0 && (
                <Button
                  onClick={claimWinnings}
                  size="sm"
                  colorScheme="yellow"
                  variant="outline"
                >
                  Claim
                </Button>
              )}
            </HStack>
          </HStack>
        )}
        {/* Hiển thị giao diện dựa trên vai trò */}
      {userRole === 'owner' && (
        <VStack spacing={4}>
          <Text>Owner Dashboard</Text>
          <SimpleGrid columns={3} spacing={8}>
            <Button onClick={handleStartTrading}>Start Trading</Button>
            <Button onClick={handleResolve}>Resolve</Button>
            <Button onClick={handleExpire}>Expire</Button>
          </SimpleGrid>
        </VStack>
      )}
        {userRole === 'customer' && (
          <>
          <Select 
            placeholder="Select Coin" 
            onChange={handleCoinSelect} 
            value={selectedCoin?.value || ''}
            color="black"
            bg="#FEDF56"
            size="lg"
          >
            {availableCoins.map((coin) => (
              <option key={coin.value} value={coin.value}>
                {coin.label}
              </option>
            ))}
          </Select>
          {selectedCoin && (
            <VStack spacing={8} alignItems="center">
              <Box
                border="2px solid #FEDF56"
                borderRadius="full"
                padding="20px"
                width="100%"
                textAlign="center"
              >
                <motion.div animate={priceControls}>
                  <Text fontSize="4xl" fontWeight="bold">
                    {currentPriceRef.current.toFixed(2)}
                  </Text>
                </motion.div>
              </Box>
              <VStack spacing={2}>
                <Text fontSize="lg">Current Phase: {Phase[currentPhase]}</Text>
                <Text fontSize="lg">Total Deposited: {totalDeposited.toFixed(4)} ETH</Text>
              </VStack>

              <VStack spacing={8} width="100%">
                <Input
                  placeholder="Enter bid amount in ETH"
                  value={bidAmount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d*$/.test(value)) setBidAmount(value);
                  }}
                  color="#FEDF56"
                  bg="transparent"
                  border="none"
                  textAlign="center"
                  _placeholder={{ color: "#FEDF56" }}
                  size="lg"
                  fontSize="xl"
                />

                <Flex justify="center" gap="100px">
                  <Button
                    onClick={() => handleBid(Side.Long)}
                    isDisabled={!bidAmount || Number(bidAmount) <= 0}
                    bg="#FEDF56"
                    color="black"
                    _hover={{ bg: "#D5D5D5", color: "green", transform: "scale(1.2)" }}
                    width="120px"
                    height="50px"
                    fontSize="xl"
                    transition="all 0.2s"
                  >
                    Up
                  </Button>
                  <Button
                    onClick={() => handleBid(Side.Short)}
                    isDisabled={!bidAmount || Number(bidAmount) <= 0}
                    bg="#FEDF56"
                    color="black"
                    _hover={{ bg: "#D5D5D5", color: "red", transform: "scale(1.2)" }}
                    width="120px"
                    height="50px"
                    fontSize="xl"
                    transition="all 0.2s"
                  >
                    Down
                  </Button>
                </Flex>

                <Table variant="simple" colorScheme="yellow">
                  <Thead>
                    <Tr>
                      <Th color="#FEDF56">Position</Th>
                      <Th color="#FEDF56" isNumeric>Your Bid</Th>
                      <Th color="#FEDF56" isNumeric>Total Market</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    <Tr>
                      <Td>Long</Td>
                      <Td isNumeric>{positions.long.toFixed(4)} ETH</Td>
                      <Td isNumeric>{positions.long.toFixed(4)} ETH</Td>
                    </Tr>
                    <Tr>
                      <Td>Short</Td>
                      <Td isNumeric>{positions.short.toFixed(4)} ETH</Td>
                      <Td isNumeric>{positions.short.toFixed(4)} ETH</Td>
                    </Tr>
                  </Tbody>
                </Table>
              </VStack>
            </VStack>
          )}
        </>
        )}

        {!isLoggedIn && (
          <Button
            onClick={connectWallet}
            backgroundColor="#FEDF56"
            color="#5D3A1A"
            _hover={{ backgroundColor: "#D5D5D5" }}
            padding="25px"
            borderRadius="full"
            fontWeight="bold"
            fontSize="xl"
            w="full"
          >
            Login / Connect Wallet
          </Button>
        )}
      </VStack>
      
      {countdown !== null && (
        <Box
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          bg="rgba(0, 0, 0, 0.8)"
          color="#FEDF56"
          fontSize="6xl"
          fontWeight="bold"
          p={8}
          borderRadius="xl"
          zIndex={1000}
        >
          {countdown}
        </Box>
      )}
      <ScaleFade initialScale={0.9} in={showResult}>
        <Box
          position="fixed"
          top="50%"
          left="50%"
          transform="translate(-50%, -50%)"
          bg={resultMessage === "YOU WIN" ? "green.500" : "red.500"}
          color="white"
          fontSize="5xl"
          fontWeight="bold"
          p={8}
          borderRadius="xl"
          zIndex={1000}
        >
          {resultMessage}
        </Box>
      </ScaleFade>
    </Flex>
  );
}
export default OptionMarket;