import { HStack, Text, Flex, Stack } from "@chakra-ui/react";
import Link from "next/link";
import React, { memo } from "react";
import { fonts } from "../../configs/constants";
import { formatDate } from "../../utils";
import { useAppSelector } from "../../reduxs/hooks";

const UserList = () => {
  const { picks } = useAppSelector((p) => p.account);

  return (
    <Flex
      as="ul"
      w={{ base: "100%", lg: "35%" }}
      bg="rgba(255,255,255, 0.11)"
      direction="column"
      borderRadius="6px"
      border="1px solid rgba(255,255,255, 0.2)"
      mt="50px"
    >
      <HStack
        as="li"
        py="10px"
        justifyContent="space-between"
        borderBottom="1px solid rgba(255,255,255, 0.2)"
        px="10px"
      >
        <Stack direction={{ base: "column", lg: "row" }}>
          <Text
            w="150px"
            variant="with-title"
            fontSize="10px"
            color="rgba(255,255,255, 0.6)"
          >
            Timestamp
          </Text>

          <Text
            w="98px"
            variant="with-title"
            fontSize="10px"
            color="rgba(255,255,255, 0.6)"
          >
            Price
          </Text>

          <Text
            variant="with-title"
            fontSize="10px"
            color="rgba(255,255,255, 0.6)"
          >
            Your pick
          </Text>
        </Stack>
      </HStack>
      {picks.map((item, index) => (
        <HStack
          as="li"
          key={index}
          py="10px"
          justifyContent="space-between"
          borderBottom="1px solid rgba(255,255,255, 0.2)"
          px="10px"
        >
          <Stack direction={{ base: "column", lg: "row" }}>
            <Text
              w="150px"
              variant="with-title"
              fontFamily={fonts.DMSANS_ITALIC}
              fontSize="12px"
              color="gray"
              fontStyle="italic"
              mb="-10px"
            >
              {formatDate(item.startAt)}
            </Text>

            <Text
              w="100px"
              variant="with-title"
              fontFamily={fonts.DMSANS_ITALIC}
              fontSize="12px"
              color="gray"
              fontStyle="italic"
              mb="-10px"
            >
              {item.price}
            </Text>
            <Text
              variant="with-title"
              fontSize="10px"
              color="rgba(255,255,255, 0.6)"
            >
              {item.yourPick}
            </Text>
          </Stack>
        </HStack>
      ))}
    </Flex>
  );
};

export default memo(UserList);
