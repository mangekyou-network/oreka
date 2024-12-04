import React, { useState, useEffect, useRef } from 'react';
import { useCallback } from 'react'; // Thêm import useCallback
import {
  Flex, Box, Text, Button, VStack, useToast, Input,
  Select, HStack, Icon, ScaleFade, Table, Thead, Tbody, Tr, Th, Td
} from '@chakra-ui/react';
import { FaEthereum, FaWallet, FaTrophy } from 'react-icons/fa';
import { ethers } from 'ethers';
import { BigNumber } from 'ethers';
import { motion, useAnimation } from 'framer-motion';
import Owner from './Owner';
import BinaryOptionMarket from '../../../out/BinaryOptionMarketPyth.sol/BinaryOptionMarket.json';
import { useRouter } from 'next/router';
import { SMART_CONTRACT_ADDRESS } from '../configs/constants';
import ERC20_ABI from '../contracts/abis/ERC20.json'; // You'll need to create this file with the ERC20 ABI
enum Side { Long, Short }
enum Phase {
  Starting,    // Initial phase
  Bidding,     // After startTrading is called
  Maturity,    // After resolveMarket is called
  Expiry       // Final phase
}

interface Coin {
  value: string;
  label: string;
}

function Customer() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [balance, setBalance] = useState(0);
  const [contractBalance, setContractBalance] = useState(0);
  const [accumulatedWinnings, setAccumulatedWinnings] = useState(0);
  const [bidAmount, setBidAmount] = useState("");
  const [currentPhase, setCurrentPhase] = useState<Phase>(Phase.Bidding);
  //const [positions, setPositions] = useState({ long: 0, short: 0 });
  const [totalDeposited, setTotalDeposited] = useState(0);
  const [strikePrice, setStrikePrice] = useState<number>(0);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [showClaimButton, setShowClaimButton] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [reward, setReward] = useState(0); // Số phần thưởng khi người chơi thắng
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [positions, setPositions] = useState<{ long: number; short: number }>({ long: 0, short: 0 });
  const [tokenContract, setTokenContract] = useState<ethers.Contract | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string>("0");
  const TOKEN_ADDRESS = "0xf805ce4F96e0EdD6f0b6cd4be22B34b92373d696"; // USDe token address

  const [availableCoins] = useState<Coin[]>([
    { value: "0x5fbdb2315678afecb367f032d93f642f64180aa3", label: "WIF/USD" },
    { value: "0x6fbdb2315678afecb367f032d93f642f64180aa3", label: "ETH/USD" },
    { value: "0x7fbdb2315678afecb367f032d93f642f64180aa3", label: "BTC/USD" }
  ]);

  const toast = useToast();
  const priceControls = useAnimation();
  const router = useRouter(); // Initialize the router
  const [contractAddress, setContractAddress] = useState<string>("");

  const [stakingRewards, setStakingRewards] = useState<{
    initialAmount: string;
    currentAmount: string;
    rewards: string;
  }>({
    initialAmount: "0",
    currentAmount: "0",
    rewards: "0"
  });

  useEffect(() => {
    // Check if contractAddress is available in the query parameters
    if (router.query.contractAddress) {
      setContractAddress(router.query.contractAddress as string); // Set the contractAddress from query
    } else {
      setContractAddress(SMART_CONTRACT_ADDRESS); // Default address if not provided
    }
  }, [router.query.contractAddress]);

  useEffect(() => {
    if (isLoggedIn) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const newContract = new ethers.Contract(contractAddress, BinaryOptionMarket.abi, signer);
      setContract(newContract);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (contract) {
        fetchMarketDetails();
      }
    }, 5000); // Gọi hàm mỗi 5 giây
    return () => clearInterval(interval); // Clear interval khi component bị unmount
  }, [contract]);

  useEffect(() => {
    if (contractAddress) {
      fetchContractBalance();
    }
  }, [contractAddress]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (walletAddress) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balanceWei = await provider.getBalance(walletAddress);
        const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei));
        setBalance(balanceEth);
      }
    };

    fetchBalance();
  }, [walletAddress, contract]);



  // Kết nối ví MetaMask
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();

        // Setup token contract
        const token = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);
        setTokenContract(token);

        // Get token balance instead of ETH balance
        const tokenDecimals = await token.decimals();
        const tokenBalanceBN = await token.balanceOf(address);
        const formattedBalance = ethers.utils.formatUnits(tokenBalanceBN, tokenDecimals);

        setWalletAddress(address);
        setTokenBalance(formattedBalance);
        setIsLoggedIn(true);

        toast({
          title: "Wallet connected successfully!",
          description: `Address: ${abbreviateAddress(address)}`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error: any) {
        console.error("Failed to connect wallet:", error);
        toast({
          title: "Failed to connect wallet",
          description: error.message,
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

  // Lấy trạng thái từ smart contract

  const fetchMarketDetails = useCallback(async () => {
    if (contract) {
      try {
        const phase = await contract.currentPhase();
        setCurrentPhase(phase);
        const oracleDetails = await contract.oracleDetails();
        const strikePriceBN = BigNumber.from(oracleDetails.strikePrice);
        const finalPriceBN = BigNumber.from(oracleDetails.finalPrice);

        console.log("Strike Price:", oracleDetails.strikePrice);
        console.log("Final Price:", oracleDetails.finalPrice);

        // Format prices consistently - assuming 8 decimals from Pyth oracle
        setStrikePrice(parseFloat(ethers.utils.formatUnits(strikePriceBN, 8)));
        setFinalPrice(parseFloat(ethers.utils.formatUnits(finalPriceBN, 8)));
      } catch (error: any) {
        console.error("Error fetching market details:", error);
      }
    }
  }, [contract]);

  const fetchContractBalance = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contractBalanceWei = await provider.getBalance(contractAddress);
      const contractBalanceEth = parseFloat(ethers.utils.formatEther(contractBalanceWei));
      setContractBalance(contractBalanceEth); // Cập nhật vào state
    } catch (error) {
      console.error("Failed to fetch contract balance:", error);
    }
  };

  // Cập nhật trạng thái và thực hiện đếm ngược
  useEffect(() => {
    if (currentPhase === Phase.Maturity) {
      setCountdown(5);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev !== null && prev > 0) {
            return prev - 1;
          } else {
            clearInterval(countdownInterval);
            setCountdown(null);
            setCurrentPhase(Phase.Expiry);
            return null;
          }
        });
      }, 1000);

      setTimeout(async () => {
        clearInterval(countdownInterval);
        setCountdown(null);

        await fetchMarketDetails();

        if (contract) {
          const oracleDetails = await contract.oracleDetails();
          const finalPriceBN = BigNumber.from(oracleDetails.finalPrice);
          const strikePriceBN = BigNumber.from(oracleDetails.strikePrice);

          // Format both prices with the same number of decimals
          const finalPrice = parseFloat(ethers.utils.formatUnits(finalPriceBN, 8));
          const strikePrice = parseFloat(ethers.utils.formatUnits(strikePriceBN, 8));

          console.log("Formatted Final Price:", finalPrice);
          console.log("Formatted Strike Price:", strikePrice);
          console.log("Selected Side:", selectedSide);

          // Now compare the properly formatted numbers
          if (selectedSide === Side.Long && finalPrice >= strikePrice) {
            setResultMessage("YOU WIN");
          } else if (selectedSide === Side.Short && finalPrice <= strikePrice) {
            setResultMessage("YOU WIN");
          } else {
            setResultMessage("YOU LOSE");
          }
          setShowResult(true);

          setTimeout(() => {
            setShowResult(false);
          }, 2000);
        }
      }, 5000);
    }
  }, [currentPhase]);

  // Hàm chọn đồng tiền ảo
  const handleCoinSelect = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    setSelectedCoin(availableCoins.find(coin => coin.value === selectedValue) || null);

    // Gọi hàm để lấy strikePrice ngay khi chọn coin
    if (contract) {
      const oracleDetails = await contract.oracleDetails();
      const strikePrice = oracleDetails.strikePrice; // Lấy giá trị strikePrice
      setStrikePrice(strikePrice instanceof BigNumber ? strikePrice.toNumber() : 0); // Cập nhật strikePrice
    }
  };

  // Hàm đặt cược
  const handleBid = async (side: Side) => {
    if (!bidAmount || Number(bidAmount) <= 0 || !selectedCoin || !tokenContract) {
      toast({
        title: "Invalid Input",
        description: "Please select a coin and enter a valid bid amount.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      if (currentPhase !== Phase.Bidding) {
        toast({
          title: "Market is not in bidding phase",
          description: "Please wait for the bidding phase to start.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Convert bid amount to token decimals
      const tokenDecimals = await tokenContract.decimals();
      const bidAmountInTokens = ethers.utils.parseUnits(bidAmount, tokenDecimals);

      // First approve the market contract to spend tokens
      const approveTx = await tokenContract.approve(contractAddress, bidAmountInTokens);
      await approveTx.wait();

      // Then make the bid
      const tx = await contract?.bid(side, bidAmountInTokens);
      await tx.wait();

      // Store selected side in state
      setSelectedSide(side);

      // Update balances and positions
      const newBalance = await tokenContract.balanceOf(walletAddress);
      setTokenBalance(ethers.utils.formatUnits(newBalance, tokenDecimals));

      setPositions(prev => ({
        ...prev,
        [Side[side].toLowerCase() as keyof typeof prev]:
          prev[Side[side].toLowerCase() as keyof typeof prev] + Number(bidAmount)
      }));
      setTotalDeposited(prev => prev + Number(bidAmount));

      fetchMarketDetails();
      setBidAmount("");

      toast({
        title: "Bid placed successfully!",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      console.error("Error placing bid:", error);
      toast({
        title: "Error placing bid",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (contract && currentPhase !== Phase.Bidding) { // Ngăn không cho cập nhật trong phase Bidding
        fetchMarketDetails();
      }
    }, 5000); // Gọi hàm mỗi 5 giây
    return () => clearInterval(interval); // Clear interval khi component bị unmount
  }, [contract, currentPhase]);

  // Hàm claimReward khi phase là Expiry
  const claimReward = async () => {
    if (contract && currentPhase === Phase.Expiry) {
      const provider = new ethers.providers.Web3Provider(window.ethereum); // Define provider here
      try {
        const tx = await contract.claimReward();  // Gọi smart contract
        await tx.wait();

        const newBalanceWei = await provider.getBalance(walletAddress);
        const newBalanceEth = parseFloat(ethers.utils.formatEther(newBalanceWei));

        const fee = (reward * 0.10); // 10% phí
        const finalReward = reward - fee;

        setBalance(newBalanceEth);  // Cập nhật lại số dư
        setReward(finalReward);  // Reset lại reward sau khi claim
        setShowClaimButton(false);  // Ẩn nút claim sau khi đã nhận
        setTotalDeposited(0);
        // Cập nhật lại bảng Long/Short
        await fetchMarketDetails(); // Gọi lại hàm để cập nhật thông tin
        await fetchContractBalance();


        toast({
          title: "Reward claimed!",
          description: `You've successfully claimed your reward.`,
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: "Error claiming reward",
          description: "An error occurred. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };


  const canClaimReward = useCallback(async () => {
    if (contract && currentPhase === Phase.Expiry) {
      console.log("Checking claim eligibility..."); // Log để kiểm tra
      try {
        const hasClaimed = await contract.hasClaimed(walletAddress);
        console.log("Has claimed:", hasClaimed); // Log giá trị hasClaimed
        const oracleDetails = await contract.oracleDetails();
        const finalPriceBN = BigNumber.from(oracleDetails.finalPrice);
        const strikePriceBN = BigNumber.from(oracleDetails.strikePrice);

        const finalPrice = parseFloat(ethers.utils.formatUnits(finalPriceBN, 0)); // Chuyển đổi giá trị cuối
        const strikePrice = parseFloat(ethers.utils.formatUnits(strikePriceBN, 0)); // Chuyển đổi giá trị strike    

        // Sửa lại việc kiểm tra `finalPrice` và `strikePrice`
        let winningSide = finalPrice >= strikePrice ? Side.Long : Side.Short;

        let userDeposit = 0;
        if (winningSide === selectedSide) {
          // Nếu người chơi chọn đúng bên thắng, kiểm tra khoản cược
          userDeposit = winningSide === Side.Long ? await contract.longBids(walletAddress) : await contract.shortBids(walletAddress);
        }

        console.log("Winning side:", winningSide); // Log bên thắng
        console.log("User deposit:", userDeposit); // Log số tiền cược của người dùng

        // Đảm bảo tính toán phần thưởng và cập nhật biến `reward`
        if (!hasClaimed && userDeposit > 0) {
          const totalWinningDeposits = winningSide === Side.Long ? positions.long : positions.short;
          const calculatedReward = ((userDeposit * totalDeposited) / totalWinningDeposits) * 0.90;

          const formattedReward = parseFloat(ethers.utils.formatEther(calculatedReward.toString()));
          setReward(formattedReward);  // Cập nhật phần thưởng
          setShowClaimButton(true);
        } else {
          setShowClaimButton(false);
        }
      } catch (error) {
        console.error("Error checking claim eligibility:", error);
        setShowClaimButton(false);
      }
    }
  }, [contract, currentPhase, walletAddress, selectedSide, positions, totalDeposited]);


  useEffect(() => {
    console.log("Current phase:", currentPhase); // Log giá trị currentPhase
    if (currentPhase === Phase.Expiry) {
      canClaimReward();
    }
  }, [contract, currentPhase, walletAddress, selectedSide]);

  // Reset lại thị trường
  const resetMarket = () => {
    setPositions({ long: 0, short: 0 });
    setTotalDeposited(0);
    setStrikePrice(0); // Đặt lại giá strikePrice mặc định hoặc giá khởi tạo
    setFinalPrice(0);
    setCurrentPhase(Phase.Bidding);
    priceControls.set({ opacity: 1, color: "#FEDF56" });
  };


  const abbreviateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const fetchStakingRewards = async () => {
    if (contract) {
      try {
        // First check if funds are staked
        const [isStaked, ,] = await contract.getStakingState();

        if (!isStaked) {
          setStakingRewards({
            initialAmount: "0",
            currentAmount: "0",
            rewards: "0"
          });
          return;
        }

        const [initialAmount, currentAmount, rewards] = await contract.getAccruedRewards();

        // Convert BigNumber to formatted strings
        setStakingRewards({
          initialAmount: ethers.utils.formatUnits(initialAmount, 18),
          currentAmount: ethers.utils.formatUnits(currentAmount, 18),
          rewards: ethers.utils.formatUnits(rewards, 18)
        });
      } catch (error) {
        console.error("Error fetching staking rewards:", error);
        // Set default values on error
        setStakingRewards({
          initialAmount: "0",
          currentAmount: "0",
          rewards: "0"
        });
      }
    }
  };

  useEffect(() => {
    if (contract) {
      fetchStakingRewards();
      const interval = setInterval(fetchStakingRewards, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [contract]);

  // Add useEffect to fetch user's selected side when contract is ready
  useEffect(() => {
    const fetchUserSelectedSide = async () => {
      if (contract && walletAddress) {
        try {
          const side = await contract.getUserSelectedSide(walletAddress);
          setSelectedSide(side);
        } catch (error) {
          console.error("Error fetching user selected side:", error);
        }
      }
    };

    fetchUserSelectedSide();
  }, [contract, walletAddress]);

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
              <Text>{parseFloat(tokenBalance).toFixed(2)} USDe</Text>
            </HStack>
            <HStack>
              {/* <Icon as={FaTrophy} />
              <Text>{accumulatedWinnings.toFixed(4)} ETH</Text> */}
              {reward > 0 && showClaimButton && (
                <Button onClick={claimReward} size="sm" colorScheme="yellow" variant="outline"
                  isDisabled={reward === 0}
                >
                  Claim {reward.toFixed(4)} USDe
                </Button>
              )}
            </HStack>
          </HStack>
        )}

        {isLoggedIn ? (
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
                      {countdown !== null ? "" : (currentPhase === Phase.Maturity || currentPhase === Phase.Expiry ? finalPrice.toFixed(2) : strikePrice.toFixed(2))}
                    </Text>
                  </motion.div>
                </Box>
                <VStack spacing={2}>
                  <Text fontSize="lg">Current Phase: {Phase[currentPhase]}</Text>
                  <Text fontSize="lg">Total Deposited: {totalDeposited.toFixed(4)} USDe</Text>
                </VStack>

                <VStack spacing={8} width="100%">
                  <Input
                    placeholder="Enter bid amount in USDe"
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
                      isDisabled={!bidAmount || Number(bidAmount) <= 0 || !selectedCoin || currentPhase !== Phase.Bidding}
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
                      isDisabled={!bidAmount || Number(bidAmount) <= 0 || !selectedCoin || currentPhase !== Phase.Bidding}
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
                        <Td isNumeric>{positions.long.toFixed(4)} USDe</Td>
                        <Td isNumeric>{positions.long.toFixed(4)} USDe</Td>
                      </Tr>
                      <Tr>
                        <Td>Short</Td>
                        <Td isNumeric>{positions.short.toFixed(4)} USDe</Td>
                        <Td isNumeric>{positions.short.toFixed(4)} USDe</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                </VStack>
              </VStack>
            )}
          </>
        ) : (
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
      {isLoggedIn && stakingRewards.initialAmount !== "0" && (
        <Box
          border="1px solid #FEDF56"
          borderRadius="lg"
          p={4}
          mt={4}
          width="100%"
        >
          <Text fontSize="lg" fontWeight="bold" mb={3}>Staking Rewards</Text>
          <Table variant="simple" colorScheme="yellow" size="sm">
            <Tbody>
              <Tr>
                <Td>Initial Stake</Td>
                <Td isNumeric>{parseFloat(stakingRewards.initialAmount).toFixed(4)} USDe</Td>
              </Tr>
              <Tr>
                <Td>Current Value</Td>
                <Td isNumeric>{parseFloat(stakingRewards.currentAmount).toFixed(4)} USDe</Td>
              </Tr>
              <Tr>
                <Td>Accrued Rewards</Td>
                <Td isNumeric color={parseFloat(stakingRewards.rewards) > 0 ? "green.400" : undefined}>
                  {parseFloat(stakingRewards.rewards).toFixed(4)} USDe
                </Td>
              </Tr>
            </Tbody>
          </Table>
        </Box>
      )}
    </Flex>
  );
}

export default Customer;
