import { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import Factory from '../../../out/Factory.sol/Factory.json';

const ListAddressOwner = ({ ownerAddress }: { ownerAddress: string }) => {
    const [deployedContracts, setDeployedContracts] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const contractAddress = '0x4c5859f0F772848b2D91F1D83E2Fe57935348029'; // Địa chỉ của hợp đồng Factory

    useEffect(() => {
        const fetchDeployedContracts = async () => {
            if (!ownerAddress) return; // Kiểm tra nếu không có địa chỉ owner

            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const contract = new ethers.Contract(contractAddress, Factory.abi, provider);
                console.log("Fetching contracts for owner:", ownerAddress); // Log địa chỉ owner
                const contracts = await contract.getContractsByOwner(ownerAddress); // Lấy danh sách contract
                console.log("Deployed Contracts:", contracts); // Log danh sách hợp đồng
                setDeployedContracts(contracts); // Lưu vào state
            } catch (error) {
                console.error("Failed to fetch deployed contracts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeployedContracts();
    }, [ownerAddress]); // Thêm ownerAddress vào dependency array

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
                    {
                        // Explicitly type the map function to avoid complex union types
                        deployedContracts.map((address: string, index: number) => (
                            <Box key={index} p={4} borderWidth={1} borderRadius="md" mb={4}>
                                <Text>Contract Address: {address}</Text>
                                <Text>Create Date: 24/10/2024</Text>
                                <Text>Resolve Date: 26/10/2024, Time: 7am</Text>
                                <HStack spacing={4} mt={2}>
                                    <Button colorScheme="green">Value of LONG</Button>
                                    <Button colorScheme="red">Value of SHORT</Button>
                                </HStack>
                            </Box>
                        ))
                    }
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