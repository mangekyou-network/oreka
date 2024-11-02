import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import Factory from '../../../out/Factory.sol/Factory.json';
import { useToast } from '@chakra-ui/react';

interface ListAddressOwnerProps {
    ownerAddress: string; // Đảm bảo ownerAddress là địa chỉ hợp lệ
}

const ListAddressOwner: React.FC<ListAddressOwnerProps> = ({ ownerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" }) => {
    const [deployedContracts, setDeployedContracts] = useState<string[]>([]);
    const FactoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; // Thay YOUR_FACTORY_CONTRACT_ADDRESS bằng địa chỉ thực tế
    const [loading, setLoading] = useState<boolean>(true);
    const toast = useToast();

    useEffect(() => {
        const fetchDeployedContracts = async () => {
            if (!ownerAddress) {
                console.error("Owner address is not provided");
                return;
            }
    
            console.log("Fetching contracts for owner address:", ownerAddress);
    
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const contract = new ethers.Contract(FactoryAddress, Factory.abi, provider);
            
            // Kiểm tra contract chứa hàm `getContractsByOwner`
            console.log("Available contract methods:", contract.functions);
    
            try {
                const contracts = await contract.getContractsByOwner(ownerAddress);
                console.log("Contracts fetched from Factory contract:", contracts);
                setDeployedContracts(contracts);
            } catch (error) {
                console.error("Error fetching contracts:", error);
            } finally {
                setLoading(false);
            }
        };
    
        fetchDeployedContracts();
    }, [ownerAddress]);
    
     // Hàm rút gọn địa chỉ ví
     const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };


    return (
        <VStack spacing={8} align="stretch" minHeight="100vh">
            <HStack spacing={8} align="stretch" flexGrow={1}>
                {/* Bên Trái: Danh sách Coin */}
                <Box width="30%" borderRight="1px" borderColor="gray.200" p={4}>
                    <Text fontSize="2xl" fontWeight="bold">COIN</Text>
                    <VStack spacing={2} mt={4}>
                        <Button variant="outline" width="100%">ALL COINS</Button>
                        <Button variant="outline" width="100%">WIF/USD</Button>
                        <Button variant="outline" width="100%">ETH/USD</Button>
                        <Button variant="outline" width="100%">BTC/USD</Button>
                    </VStack>
                </Box>

                {/* Bên Phải: Danh sách Sự kiện */}
                <Box width="70%" p={4}>
                    <Text fontSize="2xl" fontWeight="bold">ALL EVENTS</Text>
                    {loading ? (
                        <Text>Loading...</Text>
                    ) : deployedContracts.length > 0 ? (
                        deployedContracts.map((address, index) => (
                            <Box key={index} p={4} borderWidth={1} borderRadius="md" mb={4}>
                                <Text fontSize="lg" fontWeight="bold">Contract #{index + 1}</Text>
                                <Text>Contract Address: {address}</Text>
                                <Text>Create Date: 24/10/2024</Text>
                                <Text>Resolve Date: 26/10/2024, Time: 7am</Text>
                                <HStack spacing={4} mt={2}>
                                    <Button colorScheme="green" size="sm">Value of LONG</Button>
                                    <Button colorScheme="red" size="sm">Value of SHORT</Button>
                                </HStack>
                            </Box>
                        ))
                    ) : (
                        <Text>No contracts found for this owner.</Text>
                    )}
                </Box>
            </HStack>

            {/* Footer với nút phân trang */}
            <Box as="footer" p={4} textAlign="center">
                <HStack spacing={2} justify="center">
                    <Button colorScheme="pink">1</Button>
                    <Button colorScheme="pink">2</Button>
                    <Button colorScheme="pink">3</Button>
                    <Button colorScheme="pink">4</Button>
                    <Button colorScheme="pink">5</Button>
                    <Button colorScheme="pink">Trang cuối</Button>
                </HStack>
            </Box>
        </VStack>
    );
};

export default ListAddressOwner;
