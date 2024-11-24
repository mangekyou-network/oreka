import { Flex, SimpleGrid, useToast, VStack } from "@chakra-ui/react";
import React, { useCallback, useEffect, useState } from "react";
import { OptionButton } from "../../components";
import Dropdown from "../../components/Dropdown";
import { UP_DOWN_TYPE } from "../../contracts/types";
import {
  setPickItemAction,
  startResultAction,
} from "../../reduxs/accounts/account.actions";
import { useAppDispatch, useAppSelector } from "../../reduxs/hooks";
import { getToast } from "../../utils";
import UserList from "./UserList";
import { UpDownContract } from "../../contracts/UpDownContract";
import { BinaryOptionMarketContract } from "../../contracts/BinaryOptionMarketContract";

const DEFAULT_SECOND = 30;

export default function UpDownContainer() {
  const dispatch = useAppDispatch();
  const [waiting, setWaiting] = useState<boolean>(false);
  const [countDown, setCountDown] = useState<number>(0);
  const [coinData, setCoinData] = useState([]);
  const { walletInfo, web3Provider, point } = useAppSelector(
    (state) => state.account
  );

  const [headTail, setHeadTail] = React.useState<UP_DOWN_TYPE | undefined>();
  const [smAddress, setSmAddress] = React.useState<string>("");
  const [price, setPrice] = React.useState<number>();
  const toast = useToast();

  const getLastedPriceByAddress = useCallback(async () => {
    try {
      if (web3Provider && smAddress) {
        const sm = new UpDownContract(web3Provider, smAddress);
        const rs = await sm.latestRoundDataAsync();
        setPrice(rs.answer);
      }
    } catch (ex) {
      console.error(ex);
    }
  }, [smAddress, web3Provider]);

  const handleCheckResult = async () => {
    if (web3Provider && smAddress) {
      const sm = new UpDownContract(web3Provider, smAddress);
      const rs = await sm.latestRoundDataAsync();
      const name = coinData.find((p) => p.value === smAddress)?.lable;
      const isHigher = rs.answer > (price || -1);
      if (isHigher && headTail === UP_DOWN_TYPE.HEAD) {
        dispatch(startResultAction(5));
        toast(
          getToast(
            `You have added 5 tUSD. The latest price of ${name} is ${rs.answer}.`,
            "success",
            "Congratulations"
          )
        );
      } else {
        dispatch(startResultAction(-5));
        toast(
          getToast(
            `Ops, You lost 5 tUSD. The latest price of ${name} is ${rs.answer}.`,
            "warning",
            "Ooh"
          )
        );
      }
      setSmAddress("");
      setPrice(undefined);
    }
  };

  const handleStartNow = async () => {
    if (headTail === undefined || smAddress === undefined || !web3Provider)
      return;
    if (point < 5) {
      toast(getToast("your scores isn't enough."));
      return;
    }
    try {
      const sm = new UpDownContract(web3Provider, smAddress);
      const rs = await sm.latestRoundDataAsync();
      setCountDown(DEFAULT_SECOND);
      setWaiting(true);
      setPrice(rs.answer);
      dispatch(
        setPickItemAction({
          startAt: new Date(),
          price: rs.answer,
          yourPick: `${coinData.find((p) => p.value === smAddress)?.lable || ""
            } (${headTail === UP_DOWN_TYPE.HEAD ? "UP" : "DOWN"})`,
        })
      );
    } catch (er: any) {
      toast(getToast(er));
    }
  };

  useEffect(async () => {
    if (coinData.length) {
      return;
    }


    coinData.push({
      value: "0x5fbdb2315678afecb367f032d93f642f64180aa3",
      lable: "WIF/USD"
    });
  });

  useEffect(() => {
    if (countDown) {
      const interval = setInterval(() => {
        setCountDown((cd) => cd - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  });

  useEffect(() => {
    getLastedPriceByAddress();
  }, [getLastedPriceByAddress]);

  useEffect(() => {
    if (waiting && countDown === 0) {
      handleCheckResult();
    }
  }, [countDown, waiting]);

  const handleBidding = async () => {
    if (headTail === undefined || smAddress === undefined || !web3Provider)
      return;
    try {
      const sm = new BinaryOptionMarketContract(web3Provider, "0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0");
      const rs = await sm.bid(0, "0.05");

      // dispatch(
      //   setPickItemAction({
      //     startAt: new Date(),
      //     price: rs.answer,
      //     yourPick: `${
      //       coinData.find((p) => p.value === smAddress)?.lable || ""
      //     } (${headTail === UP_DOWN_TYPE.HEAD ? "UP" : "DOWN"})`,
      //   })
      // );
    } catch (er: any) {
      toast(getToast(er));
    }
  }

  return (
    <>
      <Flex
        flex={1}
        w="100%"
        justifyContent="center"
        alignItems="center"
        direction="column"
      >
        <VStack w={{ base: "100%", lg: "30%" }}>
          <Dropdown
            data={coinData}
            price={price}
            selectedValue={smAddress}
            placeholder={"Select coin"}
            onSelectItem={(p) => setSmAddress(p.value as string)}
          />

          <SimpleGrid
            columns={2}
            margin="10px !important"
            spacingX="20px"
            w="full"
            mt="40px !important"
          >
            <OptionButton
              text="UP"
              w="full"
              isDisabled={headTail != UP_DOWN_TYPE.HEAD}
              onClick={() => setHeadTail(UP_DOWN_TYPE.HEAD)}
            />
            <OptionButton
              text="DOWN"
              isDisabled={headTail !== UP_DOWN_TYPE.TAIL}
              w="full"
              onClick={() => setHeadTail(UP_DOWN_TYPE.TAIL)}
            />
          </SimpleGrid>

          {countDown < 1 && (
            <div>
              <OptionButton
                w="full"
                text={!walletInfo.address ? "CONNECT YOUR WALLET" : `BID 0.05 ETH`}
                bgColor={"orange"}
                mt="30px !important"
                isDisabled={
                  !walletInfo.address ||
                  !smAddress ||
                  headTail === undefined ||
                  countDown > 0
                }
                onClick={handleBidding}
                isLoading={countDown > 0}
              />
              <OptionButton
                w="full"
                text={!walletInfo.address ? "CONNECT YOUR WALLET" : "START NOW"}
                mt="30px !important"
                isDisabled={
                  !walletInfo.address ||
                  !smAddress ||
                  headTail === undefined ||
                  countDown > 0
                }
                onClick={handleStartNow}
                isLoading={countDown > 0}
              />
            </div>
          )}
          <Flex mt="80px" mb="20px" />
          {countDown && (
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
      </Flex>
    </>
  );
}
