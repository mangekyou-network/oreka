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
import React, { memo, useCallback, useMemo } from "react";
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

  // Modified getText to show name and lable if available
  const getText = useMemo(() => {
    const item = data.find((p) => p.value === selectedValue);
    if (!item) return placeholder;
    // Show name if it exists, otherwise just lable
    return item.name ? `${item.name}: ${item.lable}` : item.lable; 
  }, [selectedValue, data, placeholder]);

  const renderItemlable = useCallback((item: IDropdownItem) => {
    if (!item) return placeholder;
    // Show name if it exists, otherwise just lable
    return item.name ? `${item.name}: ${item.lable}` : item.lable; 
}, [selectedValue, data, placeholder]);


  // Set color based on whether the placeholder is displayed or not

  const color = getText === placeholder ? "#FEDF56" : "#FEDF56";

  return (
    <Popover
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      closeOnBlur={false}
    >
      <PopoverTrigger>
        <Button
          variant="unstyled" // Đặt thành unstyled để loại bỏ nền và viền mặc định
          w="full"
          bg="transparent" // Đảm bảo nền trong suốt
          _hover={{ backgroundColor: "transparent" }} // Loại bỏ hiệu ứng hover
          _focus={{ boxShadow: "none" }} // Loại bỏ hiệu ứng focus
          padding={0} // Bỏ padding nếu có
        >
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
        border="none" // Loại bỏ viền của PopoverContent
        boxShadow="0px 4px 4px rgba(0, 0, 0, 0.25)" // Loại bỏ shadow
        padding={0}
        w="420px"
        // bg="transparent" // Đặt nền trong suốt cho PopoverContent
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
                _hover={{ border: "1px solid #fff" }}
                px="15px"
              >
                {/* Displaying the name and lable, or just lable if name is not available */}
                <Text
                  variant="notoSan"
                  color="#6f632a"
                  fontSize="16px"
                  width="100%"
                  textAlign="center"
                >
                  {drop.name ? `${drop.name}: ${drop.lable}` : drop.lable}
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