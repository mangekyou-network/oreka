import { UseToastOptions } from "@chakra-ui/react";
import moment from "moment";

const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm:ss";

export const showSortAddress = (address: string): string => {
  return `${address?.substr(0, 4)}...${address?.substr(
    address.length - 4,
    address.length - 1
  )}`;
};

export const numberFormat = (number: number | string) =>
  new Intl.NumberFormat().format(Number(number));

export const getToast = (
  description: string | object,
  status: UseToastOptions["status"] = "error",
  title = "Error"
): UseToastOptions => {
  if (typeof description === "string")
    return {
      title,
      status,
      position: "top-right",
      description,
      duration: 3000,
    };
  let msg = "something wrong!";
  // @ts-ignore no problem in operation, although type error appears.
  if (typeof description === "object" && description["message"]) {
    // @ts-ignore no problem in operation, although type error appears.
    msg = description["message"];
  }
  return {
    title,
    status,
    position: "top-right",
    description: msg,
    duration: 3000,
  };
};

export function formatDate(date: Date) {
  return moment(date).format(DATE_TIME_FORMAT);
}
