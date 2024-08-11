import {
  Box,
  Flex,
  HStack,
  Image,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import Link from "next/link";
import { ConnectWallet, WalletInformation } from "../components";
import { useAppDispatch, useAppSelector } from "../reduxs/hooks";
import React from "react";

export default function Header() {
  const { walletInfo } = useAppSelector((state) => state.account);
  const dispatch = useAppDispatch();

  return (
    <Flex
      w="full"
      h="120px"
      alignItems="center"
      justifyContent="center"
      px="20px"
    >
      {!walletInfo.address && <ConnectWallet />}
      {walletInfo.address && <WalletInformation />}
    </Flex>
  );
}
