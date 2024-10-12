import React, { useState, useEffect } from 'react';
import { Flex, Box, Text, Button, SimpleGrid, VStack, useToast, Input } from '@chakra-ui/react';
import { ethers } from 'ethers';
import OptionButton from "../components/OptionButton";
import Dropdown from "../components/Dropdown";
import { UP_DOWN_TYPE } from "../contracts/types/index";
import UserList from "../views/plays/UserList";
import { useAppSelector } from "../reduxs/hooks";
import ContractBalance from './Contractbalance';
import { SMART_CONTRACT_ADDRESS } from '../configs/constants';
import BinaryOptionMarketABI from '../contracts/abis/BinaryOptionMarketABI.json';

function OptionMarket() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); // 'owner' or 'customer'
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [rewardsWon, setRewardsWon] = useState(0);
  const [countDown, setCountDown] = useState(0);
  const [headTail, setHeadTail] = useState<UP_DOWN_TYPE | undefined>();
  const [bidAmount, setBidAmount] = useState("");
  const [coinData, setCoinData] = useState([]);
  const [smAddress, setSmAddress] = useState<string>("");
  const [contract, setContract] = useState<any>(null);
  const [web3Provider, setWeb3Provider] = useState<ethers.providers.Web3Provider | null>(null);
  const toast = useToast();
  const { walletInfo } = useAppSelector((state) => state.account);

  // Fetch coin data on component mount
  useEffect(() => {
    const fetchCoinData = async () => {
      const coins = [
        { value: "0x5fbdb2315678afecb367f032d93f642f64180aa3", label: "WIF/USD"},
        { value: "0x6fbdb2315678afecb367f032d93f642f64180aa3", label: "ETH/USD"},
        { value: "0x7fbdb2315678afecb367f032d93f642f64180aa3", label: "BTC/USD"}
      ];
      setCoinData(coins);
    };

    fetchCoinData();
  }, []);

  // Initialize contract when web3Provider and smAddress are set
  useEffect(() => {
    if (web3Provider && smAddress) {
      try {
        const signer = web3Provider.getSigner();
        const newContract = new ethers.Contract(smAddress, BinaryOptionMarketABI, signer);
        setContract(newContract);
      } catch (error) {
        console.error("Error initializing contract:", error);
      }
    }
  }, [web3Provider, smAddress]);

  // Wallet connection logic
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        const userAddress = accounts[0];
        setWeb3Provider(provider);
        checkUserRole(userAddress);
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Error connecting to MetaMask:", error);
      }
    } else {
      console.error("MetaMask is not installed. Please install MetaMask to use this feature.");
    }
  };

  // Role check function
  const checkUserRole = (userAddress: string) => {
    const ownerAddress = SMART_CONTRACT_ADDRESS;
    if (userAddress.toLowerCase() === ownerAddress.toLowerCase()) {
      setUserRole('owner');
    } else {
      setUserRole('customer');
    }
  };

  // Function to claim rewards
  const handleClaimReward = async () => {
    if (rewardsWon > 0 && contract) {
      try {
        await contract.claimReward();
        toast({
          title: "Reward claimed successfully!",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        setRewardsWon(0);
        setRewardClaimed(true);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to claim rewards. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } else {
      toast({
        title: "No Rewards",
        description: "No rewards to claim.",
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const [isModalVisible, setIsModalVisible] = useState(false); // Trạng thái hiển thị thông báo
  const [isWin, setIsWin] = useState(false);

  // Function to handle coin selection from the dropdown
  const handleSelectCoin = (selected: { value: string }) => {
    setSmAddress(selected.value);
  };

  // Owner functions
  const handleStartTrading = async () => {
    if (contract) {
      try {
        await contract.startTrading();
        toast({
          title: "Trading started successfully!",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to start trading. Please try again.",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
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

  const [randomNumber, setRandomNumber] = useState(0);
  const handleClick = async() => {
    const randomNum = Math.floor(Math.random()*2); 
    setRandomNumber(randomNum); 
    if (randomNum === UP_DOWN_TYPE.HEAD) {
      setIsWin(true);
    } else {
      setIsWin(false);
    }
    setIsModalVisible(true);
  }

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  return (
    <Flex justifyContent="center" alignItems="center" >
      <Box
        width={{ base: '90%', md: '700px' }}
        padding="20px"
        borderRadius="10px"
        textAlign="center"
        color="#FEDF56"
        fontFamily="Arial, sans-serif"
        maxHeight="80vh"
        overflow="auto"
        mt="-40"
      >
        {/* Owner Interface */}
        {isLoggedIn && userRole === 'owner' && (
          <VStack spacing={4}>
            <Text >Owner Dashboard</Text>
            <SimpleGrid columns={3} spacing={8}>
              <OptionButton text="Start Trading" onClick={handleStartTrading} />
              <OptionButton text="Resolve" onClick={handleResolve} />
              <OptionButton text="Expire" onClick={handleExpire} />
            </SimpleGrid>
          </VStack>
        )}

        {/* Customer Interface */}
        {isLoggedIn && userRole === 'customer' && (
          
          // <Text fontSize="lg" fontWeight="bold">Customer Dashboard</Text>
          //   <Text fontSize="sm">{Rewards Won: ${rewardsWon} ETH}</Text>
          //   <Button 
          //     onClick={handleClaimReward} 
          //     backgroundColor="#FEDF56"
          //     color="#000000"
          //     _hover={{ backgroundColor: "#FFD700" }}
          //     padding="8px"
          //     borderRadius="5px"
          //     fontWeight="bold"
          //     w="120px"
          //   >
          //     Get Rewards
          //   </Button>
          //   {rewardClaimed && <Text color="green">Reward has been claimed!</Text>}

          <VStack spacing={4}>
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              width="100%"
              maxWidth="300px" 
              margin="0 auto" 
            >
              <Dropdown
                data={coinData}
                placeholder={"Select Coin"}
                selectedValue={smAddress}
                onSelectItem={handleSelectCoin}
                width="100%"
                backgroundColor="transparent"
                border="none"
                _focus={{ boxShadow: 'none' }}
                _hover={{ backgroundColor: "#EAEAEA" }}
                padding="0"
              />
            </Box>

            <Box display="flex"
              alignItems="center"
              justifyContent="center"
              width="700px" 
              height="200px" 
              border="2px solid #FEDF56"
              borderRadius="400px"
              // backgroundColor="#FEDF56" 
              color="#FEDF56" 
              fontSize="4xl" 
              fontWeight="bold">
              <Text fontSize="7xl" fontWeight="bold" color="#FEDF56" >{randomNumber}</Text>
            </Box>

            <Input
              placeholder="Enter bid amount in ETH"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              bg="#FEDF56" 
              color="#5D3A1A" 
              border="1px solid #000000"
              borderRadius="full"
              width="100%"
              height="50px"
              textAlign="center"
              mb={3}
              _placeholder={{ color: "#5D3A1A", fontSize: "xl" }} 
              fontWeight="bold"
            />

              
           

            <Flex justify="center" mt={2} mb={2} gap="10px"> 
              <Button
                bg="#FFD700"
                color="#5D3A1A"
                borderRadius="full"
                width="320px" 
                height="60px"
                backgroundColor="#FEDF56"
                _hover={{ backgroundColor: "#28A745" }}
                pointerEvents="auto"
                onClick={() => handleClick(UP_DOWN_TYPE.HEAD)}
              >
                Up
              </Button>
              <Button
                bg="#FFD700"
                color="#5D3A1A"
                borderRadius="full"
                width="320px" 
                height="60px"
                backgroundColor="#FEDF56"
                _hover={{ backgroundColor: "#DC3545" }}
                pointerEvents="auto"
                onClick={() => handleClick(UP_DOWN_TYPE.TAIL)}
              >
                Down
              </Button>
            </Flex>

            {/* Modal thông báo */}
        {isModalVisible && (
          <Box
            position="fixed"
            top="0"
            left="0"
            width="100%"
            height="100%"
            bg="rgba(0, 0, 0, 0.5)" 
            display="flex"
            justifyContent="center"
            alignItems="center"
            zIndex="999"
          >
            <Box
              width="400px"
              padding="20px"
              bg="white"
              borderRadius="10px"
              textAlign="center"
            >
              <Text fontSize="2xl" fontWeight="bold">
                {isWin ? "YOU WIN!" : "YOU LOSE!"}
              </Text>
              <Button mt={4} onClick={handleCloseModal}>Đóng</Button>
            </Box>
          </Box>
        )}

            {/* <Button 
              bg="transparent"
              border="1px solid #000000"
              borderRadius="full"
              width="100px"
              mt={3}
              color="#5D3A1A"
              backgroundColor="#FEDF56"
              _hover={{ backgroundColor: "transparent" }}
            >
              Play
            </Button> */}
          </VStack>
        )}

        {/* Default Interface */}
        {!isLoggedIn && (
          <Button 
            onClick={connectWallet} 
            backgroundColor="#EAEAEA"
            color="#5D3A1A"
            _hover={{ backgroundColor: "#D5D5D5" }}
            marginTop="15px"
            padding="10px"
            borderRadius="full"
            fontWeight="bold"
            w="full"
            backgroundColor="#FEDF56"
          >
            Login
          </Button>
        )}

      </Box>
    </Flex>
  );
}

export default OptionMarket;
