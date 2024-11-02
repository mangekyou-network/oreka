export interface IEventResponse {
  transactionHash: string;
}

export enum UP_DOWN_TYPE {
  HEAD = 0,
  TAIL = 1,
}

export enum OPTION_SIDE {
  LONG = 0,
  SHORT = 1,
}

export interface IRequestInfo {
  player: string;
  bet: number;
  betAmount: number;
  result: number;
  hasResult: boolean;
  txHash?: string;
}

export interface IOptionResponse {
  txHash: string;
  requestId: string;
}

export interface IPlayerInfo {
  winCount: number;
  total: number;
  balance: number;
}

export interface IDropdownItem {
  lable: string;
  value: string | number;
}
// Giả sử đây là định nghĩa của IDropdownItem
export interface IDropdownItem {
  value: string | number;
  lable: string;
  name?: string; 
}