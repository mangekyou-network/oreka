// import { Flex, SimpleGrid, useToast, VStack, Input, Box } from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";
// import { OptionButton } from "../../components";
// import Dropdown from "../../components/Dropdown";
// import { UP_DOWN_TYPE } from "../../contracts/types";
// import { setPickItemAction, startResultAction } from "../../reduxs/accounts/account.actions";
// import { useAppDispatch, useAppSelector } from "../../reduxs/hooks";
// import { getToast } from "../../utils";
// import UserList from "./UserList";
// import { UpDownContract } from "../../contracts/UpDownContract";
// import { BinaryOptionMarketContract } from "../../contracts/BinaryOptionMarketContract";
// import { ethers } from "ethers";
// import { SMART_CONTRACT_ADDRESS } from '../../configs/constants';
import OptionMarket from "../../components/OptionMarket";
import Owner from "../../components/Owner";

const DEFAULT_SECOND = 30;

export default function UpDownContainer() {
  // const dispatch = useAppDispatch();
  // const [waiting, setWaiting] = useState<boolean>(false);
  // const [countDown, setCountDown] = useState<number>(0);
  // const [coinData, setCoinData] = useState<any[]>([]);
  // const { walletInfo, web3Provider, point } = useAppSelector((state) => state.account);

  // const [headTail, setHeadTail] = useState<UP_DOWN_TYPE | undefined>();
  // const [smAddress, setSmAddress] = useState<string>("");
  // const [bidAmount, setBidAmount] = useState<string>(""); // State cho số lượng bid
  // const toast = useToast();

  // const getLastedPriceByAddress = useCallback(async () => {
  //   try {
  //     if (web3Provider && smAddress) {
  //       const sm = new UpDownContract(web3Provider, smAddress);
  //       const rs = await sm.latestRoundDataAsync();
  //       setPrice(rs.answer);
  //     }
  //   } catch (ex) {
  //     console.error(ex);
  //   }
  // }, [smAddress, web3Provider]);

  // const handleCheckResult = async () => {
  //   if (web3Provider && smAddress) {
  //     const sm = new UpDownContract(web3Provider, smAddress);
  //     const rs = await sm.latestRoundDataAsync();
  //     const name = coinData.find((p) => p.value === smAddress)?.lable;
  //     const isHigher = rs.answer > (price || -1);
  //     if (isHigher && headTail === UP_DOWN_TYPE.HEAD) {
  //       dispatch(startResultAction(5));
  //       toast(
  //         getToast(
  //           `You have added 5 tUSD. The latest price of ${name} is ${rs.answer}.`,
  //           "success",
  //           "Congratulations"
  //         )
  //       );
  //     } else {
  //       dispatch(startResultAction(-5));
  //       toast(
  //         getToast(
  //           `Ops, You lost 5 tUSD. The latest price of ${name} is ${rs.answer}.`,
  //           "warning",
  //           "Ooh"
  //         )
  //       );
  //     }
  //     setSmAddress("");
  //     setPrice(undefined);
  //   }
  // };

  // const handleStartNow = async () => {
  //   if (headTail === undefined || smAddress === "" || !web3Provider) return;
  //   if (point < 5) {
  //     toast(getToast("Your scores aren't enough."));
  //     return;
  //   }
  //   try {
  //     const sm = new UpDownContract(web3Provider, smAddress);
  //     const rs = await sm.latestRoundDataAsync();
  //     setCountDown(DEFAULT_SECOND);
  //     setWaiting(true);
  //     setPrice(rs.answer);
  //     dispatch(
  //       setPickItemAction({
  //         startAt: new Date(),
  //         price: rs.answer,
  //         yourPick: `${
  //           coinData.find((p) => p.value === smAddress)?.lable || ""
  //         } (${headTail === UP_DOWN_TYPE.HEAD ? "UP" : "DOWN"})`,
  //       })
  //     );
  //   } catch (er: any) {
  //     toast(getToast(er.message || er));
  //   }
  // };

  // useEffect(() => {
  //   if (coinData.length) {
  //     return;
  //   }

  //   setCoinData((prevData) => [
  //     ...prevData,
  //     {
  //       value: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
  //       lable: "WIF/USD",
  //     },
  //   ]);
  // }, [coinData]);

  // useEffect(() => {
  //   if (countDown > 0) {
  //     const interval = setInterval(() => {
  //       setCountDown((cd) => cd - 1);
  //     }, 1000);
  //     return () => clearInterval(interval);
  //   }
  // }, [countDown]);

  // useEffect(() => {
  //   getLastedPriceByAddress();
  // }, [getLastedPriceByAddress]);

  // useEffect(() => {
  //   if (waiting && countDown === 0) {
  //     handleCheckResult();
  //   }
  // }, [countDown, waiting]);

  // const handleBidding = async () => {
  //   if (headTail === undefined || smAddress === "" || !web3Provider || !bidAmount) return;
  //   try {
  //     const sm = new BinaryOptionMarketContract(
  //       web3Provider,
  //       "0xB69Dc3789f1De9524F7Ae37BCe56e3Be489F06A4"
  //     );
  //     await sm.bid(0, bidAmount); // Sử dụng số lượng bid do người dùng nhập
  //   } catch (er: any) {
  //     toast(getToast(er.message || er));
  //   }
  // };

  // const [balance, setBalance] = useState("0");

  // useEffect(() => {
  //   const fetchBalance = async () => {
  //     try {
  //       const provider = new ethers.providers.Web3Provider(window.ethereum);
  //       const balanceInWei = await provider.getBalance(SMART_CONTRACT_ADDRESS);
  //       const balanceInEther = ethers.utils.formatEther(balanceInWei);
  //       setBalance(balanceInEther);
  //     } catch (error) {
  //       console.error("Error fetching balance: ", error);
  //     }
  //   };

  //   fetchBalance();
  // }, []);

  return (
    <>
    <OptionMarket/>
    {/* <Owner/> */}
      {/* <Flex
        flex={1}
        w="100%"
        justifyContent="center"
        alignItems="center"
        direction="column"
        mt="0" // Loại bỏ khoảng cách
      >
        <VStack w={{ base: '100%', lg: '30%' }} spacing="20px">
          <Dropdown
            data={coinData}
            price={price}
            selectedValue={smAddress}
            placeholder={"Select one coin"}
            onSelectItem={(p) => setSmAddress(p.value as string)}
          />
          
          <SimpleGrid
            columns={2}
            spacingX="20px"
            w="full"
            mt="20px"
          >
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

          <Box w="full" mt="20px !important">
            <Input
              placeholder="Enter bid amount in ETH"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              border="2px solid #FEDF56" 
              borderRadius="8px"
              backgroundColor="#FEDF56" 
              color="#000000" 
              fontSize="18px"
              textAlign="center" 
              padding="10px"
              _placeholder={{ color: "#000000" }}
              fontWeight="bold" // Giống các nút còn lại
            />
          </Box>

          {countDown < 1 && (
            <OptionButton
              w="full"
              text="START NOW"
              mt="20px"
              isDisabled={
                !walletInfo.address ||
                !smAddress ||
                headTail === undefined ||
                countDown > 0
              }
              onClick={handleStartNow}
              isLoading={countDown > 0}
            />
          )}
          {countDown > 0 && (
            <OptionButton
              text={`${countDown}`}
              isDisabled={false}
              w="150px"
              h="150px"
              borderRadius="full"
              fontSize="60px"
              bgColor="transparent"
              borderWidth="5px"
              color="#fedf56"
            />
          )}
        </VStack>
        {walletInfo.address && <UserList />}
      </Flex> */}
    </>
  );
}
