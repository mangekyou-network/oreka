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

  return (
    <Flex justifyContent="center" alignItems="center" >
      <Box
        width={{ base: '90%', md: '700px' }}
        padding="20px"
        border="2px solid #FEDF56"
        borderRadius="10px"
        backgroundColor="#1a1a1a"
        textAlign="center"
        color="#FEDF56"
        fontFamily="Arial, sans-serif"
        maxHeight="80vh"
        overflow="auto"
      >
        {/* Owner Interface */}
        {isLoggedIn && userRole === 'owner' && (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="bold">Owner Dashboard</Text>
            <SimpleGrid columns={3} spacing={4}>
              <OptionButton text="Start Trading" onClick={handleStartTrading} />
              <OptionButton text="Resolve" onClick={handleResolve} />
              <OptionButton text="Expire" onClick={handleExpire} />
            </SimpleGrid>
          </VStack>
        )}

        {/* Customer Interface */}
        {isLoggedIn && userRole === 'customer' && (
          <VStack spacing={4}>
            <Text fontSize="lg" fontWeight="bold">Customer Dashboard</Text>
            <Text fontSize="sm">{`Rewards Won: ${rewardsWon} ETH`}</Text>
            <Button 
              onClick={handleClaimReward} 
              backgroundColor="#FEDF56"
              color="#000000"
              _hover={{ backgroundColor: "#FFD700" }}
              padding="8px"
              borderRadius="5px"
              fontWeight="bold"
              w="120px"
            >
              Get Rewards
            </Button>
            {rewardClaimed && <Text color="green">Reward has been claimed!</Text>}
            
            <Dropdown
              data={coinData}
              placeholder={"Select one coin"}
              selectedValue={smAddress}
              onSelectItem={handleSelectCoin}
              w="full"
            />

            <SimpleGrid columns={2} spacingX="10px" w="full" mt="20px">
              <OptionButton
                text="UP"
                w="full"
                isDisabled={headTail !== UP_DOWN_TYPE.HEAD}
                onClick={() => setHeadTail(UP_DOWN_TYPE.HEAD)}
              />
              <OptionButton
                text="DOWN"
                w="full"
                isDisabled={headTail !== UP_DOWN_TYPE.TAIL}
                onClick={() => setHeadTail(UP_DOWN_TYPE.TAIL)}
              />
            </SimpleGrid>

            <Box w="full" mt="10px">
              <Input
                placeholder="Enter bid amount in ETH"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                border="2px solid #FEDF56"
                borderRadius="8px"
                backgroundColor="#FEDF56"
                color="#000000"
                fontSize="16px"
                textAlign="center"
                padding="8px"
                _placeholder={{ color: "#000000" }}
                fontWeight="bold"
              />
            </Box>

            {countDown < 1 && (
              <OptionButton
                w="full"
                text="START NOW"
                mt="10px"
                isDisabled={
                  !walletInfo?.address ||
                  !smAddress ||
                  headTail === undefined ||
                  countDown > 0
                }
                onClick={handleStartTrading}
                isLoading={countDown > 0}
              />
            )}
            {countDown > 0 && (
              <OptionButton
                text={`${countDown}`}
                isDisabled={false}
                w="full"
                h="50px"
                fontSize="20px"
                bgColor="transparent"
                borderWidth="2px"
                borderRadius="8px"
                color="#FEDF56"
              />
            )}
          </VStack>
        )}

        {/* Default Interface */}
        {!isLoggedIn && (
          <Button 
            onClick={connectWallet} 
            backgroundColor="#FFA500"
            color="#000000"
            _hover={{ backgroundColor: "#FF8C00" }}
            marginTop="15px"
            padding="10px"
            borderRadius="5px"
            fontWeight="bold"
            w="full"
          >
            Login
          </Button>
        )}
      </Box>
    </Flex>
  );
}

export default OptionMarket;
