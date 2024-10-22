import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Box, Button, Input, VStack } from '@chakra-ui/react';
import Factory from '../contracts/abis/FactoryABI.json';  // ABI của Factory contract

const OwnerUI = () => {
  const [contractAddress, setContractAddress] = useState('');
  const [salt, setSalt] = useState('');
  const [bytecode, setBytecode] = useState(Factory.bytecode);

  // Kết nối Metamask
  const connectWallet = async () => {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  };

  const FactoryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";


  // Tính toán địa chỉ với CREATE2
  const getPredictedAddress = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const factoryContract = new ethers.Contract(FactoryAddress, Factory.abi, signer);
    
    const predictedAddress = await factoryContract.getAddress(ethers.utils.keccak256(salt), bytecode);
    setContractAddress(predictedAddress);
  };

  // Triển khai hợp đồng với CREATE2
  const deployContract = async () => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const factoryContract = new ethers.Contract(FactoryAddress, Factory.abi, signer);

    const tx = await factoryContract.deploy(ethers.utils.keccak256(salt), bytecode);
    await tx.wait();
    alert(`Contract deployed at: ${contractAddress}`);
  };

  return (
    <VStack spacing={4}>
      <Button onClick={connectWallet}>Connect Wallet</Button>
      
      <Box>
        <Input
          placeholder="Salt"
          value={salt}
          onChange={(e) => setSalt(e.target.value)}
        />
        <Button onClick={getPredictedAddress}>Get Predicted Address</Button>
      </Box>
      
      <Box>
        <Button onClick={deployContract}>Deploy Contract</Button>
      </Box>

      {contractAddress && (
        <Box>
          <p>Predicted Contract Address: {contractAddress}</p>
        </Box>
      )}
    </VStack>
  );
};

export default OwnerUI;
