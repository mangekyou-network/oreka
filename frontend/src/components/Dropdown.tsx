import {
  Popover,
  PopoverTrigger,
  Flex,
  PopoverContent,
  FlexProps,
  Text,
  PopoverBody,
  Stack,
  useDisclosure,
  Button,
  VStack,
} from "@chakra-ui/react";
import React, { memo, useMemo } from "react";
import { IDropdownItem } from "../contracts/types";
import { numberFormat } from "../utils";

interface IProps extends FlexProps {
  data: IDropdownItem[];
  selectedValue: string | number;
  showIcon?: boolean;
  price?: number;
  placeholder: string;
  contentHeight?: number;
  onSelectItem?: (item: IDropdownItem) => void;
}

function Dropdown({
  data,
  selectedValue,
  placeholder,
  price,
  showIcon = true,
  contentHeight = 100,
  onSelectItem,
  children,
  ...props
}: IProps) {
  const { onOpen, onClose, isOpen } = useDisclosure();

  // Modified getText to show name and label if available
  const getText = useMemo(() => {
    const item = data.find((p) => p.value === selectedValue);
    if (!item) return placeholder;
    // Show name if it exists, otherwise just label
    return item.name ? `${item.name}: ${item.label}` : item.label; 
  }, [selectedValue, data, placeholder]);

  // Set color based on whether the placeholder is displayed or not
  const color = getText === placeholder ? "#6a5809" : "#000";

  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      closeOnBlur={false}
    >
      <PopoverTrigger>
        <Button variant={"primary"} w="full">
          <VStack>
            {/* Centering and displaying the selected text */}
            <Text color={color} textAlign="center" width="100%">
              {getText}
            </Text>
            {/* Displaying the price if available */}
            {price !== undefined && (
              <Text color="#6a5809" fontSize="8px" textAlign="center">
                Price: {numberFormat(price || 0)}
              </Text>
            )}
          </VStack>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        border="none"
        boxShadow="0px 4px 4px rgba(0, 0, 0, 0.25)"
        padding={0}
        w="420px"
      >
        <PopoverBody p={0}>
          {/* Mapping through each dropdown item */}
          {data.map((drop) => (
            <Stack
              my="5px"
              cursor="pointer"
              key={drop.value}
              onClick={() => {
                onSelectItem && onSelectItem(drop);
                onClose(); // Close the dropdown after selection
              }}
            >
              <Flex
                py={2}
                align={"center"}
                w="full"
                _hover={{ bgColor: "#fedf56", border: "1px solid #fff" }}
                px="15px"
              >
                {/* Displaying the name and label, or just label if name is not available */}
                <Text
                  variant="notoSan"
                  color="#6f632a"
                  fontSize="16px"
                  width="100%"
                  textAlign="center"
                >
                  {drop.name ? `${drop.name}: ${drop.label}` : drop.label}
                </Text>
              </Flex>
            </Stack>
          ))}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

export default memo(Dropdown);
