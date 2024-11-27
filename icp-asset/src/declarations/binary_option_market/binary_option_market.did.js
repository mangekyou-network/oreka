export const idlFactory = ({ IDL }) => {
  const Side = IDL.Variant({ 'Short' : IDL.Null, 'Long' : IDL.Null });
  const Result_4 = IDL.Variant({ 'ok' : IDL.Text, 'err' : IDL.Text });
  const Permissions = IDL.Record({
    'canGet' : IDL.Vec(IDL.Principal),
    'canVerify' : IDL.Vec(IDL.Principal),
  });
  const AccountIdentifier = IDL.Variant({
    'principal' : IDL.Principal,
    'blob' : IDL.Vec(IDL.Nat8),
    'text' : IDL.Text,
  });
  const TokenVerbose = IDL.Record({
    'decimals' : IDL.Int,
    'meta' : IDL.Opt(IDL.Record({ 'Issuer' : IDL.Text })),
    'symbol' : IDL.Text,
  });
  const Details = IDL.Record({
    'meta' : IDL.Vec(IDL.Nat8),
    'description' : IDL.Text,
  });
  const Invoice = IDL.Record({
    'id' : IDL.Nat,
    'permissions' : IDL.Opt(Permissions),
    'creator' : IDL.Principal,
    'destination' : AccountIdentifier,
    'token' : TokenVerbose,
    'paid' : IDL.Bool,
    'verifiedAtTime' : IDL.Opt(IDL.Int),
    'amountPaid' : IDL.Nat,
    'details' : IDL.Opt(Details),
    'amount' : IDL.Nat,
  });
  const CreateInvoiceSuccess = IDL.Record({ 'invoice' : Invoice });
  const CreateInvoiceErr = IDL.Record({
    'kind' : IDL.Variant({
      'InvalidDetails' : IDL.Null,
      'InvalidAmount' : IDL.Null,
      'InvalidDestination' : IDL.Null,
      'MaxInvoicesReached' : IDL.Null,
      'BadSize' : IDL.Null,
      'InvalidToken' : IDL.Null,
      'Other' : IDL.Null,
    }),
    'message' : IDL.Opt(IDL.Text),
  });
  const CreateInvoiceResult = IDL.Variant({
    'ok' : CreateInvoiceSuccess,
    'err' : CreateInvoiceErr,
  });
  const Subaccount = IDL.Vec(IDL.Nat8);
  const Account = IDL.Record({
    'owner' : IDL.Principal,
    'subaccount' : IDL.Opt(Subaccount),
  });
  const DepositArgs = IDL.Record({
    'fee' : IDL.Opt(IDL.Nat),
    'token' : IDL.Principal,
    'spender_subaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from' : Account,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'amount' : IDL.Nat,
  });
  const Tokens = IDL.Nat;
  const BlockIndex = IDL.Nat;
  const TransferFromError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'InsufficientAllowance' : IDL.Record({ 'allowance' : Tokens }),
    'BadBurn' : IDL.Record({ 'min_burn_amount' : Tokens }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : BlockIndex }),
    'BadFee' : IDL.Record({ 'expected_fee' : Tokens }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'TooOld' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : Tokens }),
  });
  const DepositError = IDL.Variant({ 'TransferFromError' : TransferFromError });
  const Result_3 = IDL.Variant({ 'ok' : IDL.Nat, 'err' : DepositError });
  const Phase = IDL.Variant({
    'Maturity' : IDL.Null,
    'Trading' : IDL.Null,
    'Bidding' : IDL.Null,
    'Expiry' : IDL.Null,
  });
  const OracleDetails = IDL.Record({
    'finalPrice' : IDL.Float64,
    'strikePrice' : IDL.Float64,
  });
  const Position = IDL.Record({ 'long' : IDL.Nat, 'short' : IDL.Nat });
  const Tokens__2 = IDL.Record({ 'e8s' : IDL.Nat64 });
  const Tokens__1 = IDL.Record({ 'e8s' : IDL.Nat64 });
  const TransferError__1 = IDL.Variant({
    'TxTooOld' : IDL.Record({ 'allowed_window_nanos' : IDL.Nat64 }),
    'BadFee' : IDL.Record({ 'expected_fee' : Tokens__1 }),
    'TxDuplicate' : IDL.Record({ 'duplicate_of' : IDL.Nat64 }),
    'TxCreatedInFuture' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : Tokens__1 }),
  });
  const Error = IDL.Variant({
    'Transfer' : TransferError__1,
    'Other' : IDL.Text,
  });
  const Result_2 = IDL.Variant({
    'ok' : IDL.Tuple(IDL.Nat64, Tokens__2),
    'err' : Error,
  });
  const TransferArgs = IDL.Record({
    'toPrincipal' : IDL.Principal,
    'amount' : Tokens__1,
    'toSubaccount' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const Result_1 = IDL.Variant({ 'ok' : IDL.Nat64, 'err' : IDL.Text });
  const HttpHeader = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const HttpResponsePayload = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HttpHeader),
  });
  const TransformArgs = IDL.Record({
    'context' : IDL.Vec(IDL.Nat8),
    'response' : HttpResponsePayload,
  });
  const CanisterHttpResponsePayload = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(HttpHeader),
  });
  const VerifyInvoiceSuccess = IDL.Variant({
    'Paid' : IDL.Record({ 'invoice' : Invoice }),
    'AlreadyVerified' : IDL.Record({ 'invoice' : Invoice }),
  });
  const VerifyInvoiceErr = IDL.Record({
    'kind' : IDL.Variant({
      'InvalidAccount' : IDL.Null,
      'TransferError' : IDL.Null,
      'NotFound' : IDL.Null,
      'NotAuthorized' : IDL.Null,
      'InvalidToken' : IDL.Null,
      'InvalidInvoiceId' : IDL.Null,
      'Other' : IDL.Null,
      'NotYetPaid' : IDL.Null,
      'Expired' : IDL.Null,
    }),
    'message' : IDL.Opt(IDL.Text),
  });
  const VerifyInvoiceResult = IDL.Variant({
    'ok' : VerifyInvoiceSuccess,
    'err' : VerifyInvoiceErr,
  });
  const WithdrawArgs = IDL.Record({
    'to' : Account,
    'fee' : IDL.Opt(IDL.Nat),
    'token' : IDL.Principal,
    'memo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time' : IDL.Opt(IDL.Nat64),
    'amount' : IDL.Nat,
  });
  const TransferError = IDL.Variant({
    'GenericError' : IDL.Record({
      'message' : IDL.Text,
      'error_code' : IDL.Nat,
    }),
    'TemporarilyUnavailable' : IDL.Null,
    'BadBurn' : IDL.Record({ 'min_burn_amount' : Tokens }),
    'Duplicate' : IDL.Record({ 'duplicate_of' : BlockIndex }),
    'BadFee' : IDL.Record({ 'expected_fee' : Tokens }),
    'CreatedInFuture' : IDL.Record({ 'ledger_time' : IDL.Nat64 }),
    'TooOld' : IDL.Null,
    'InsufficientFunds' : IDL.Record({ 'balance' : Tokens }),
  });
  const WithdrawError = IDL.Variant({
    'TransferError' : TransferError,
    'InsufficientFunds' : IDL.Record({ 'balance' : Tokens }),
  });
  const Result = IDL.Variant({ 'ok' : IDL.Nat, 'err' : WithdrawError });
  const BinaryOptionMarket = IDL.Service({
    'bid' : IDL.Func([Side, IDL.Nat], [Result_4], []),
    'changeStrikePrice' : IDL.Func([IDL.Float64], [], []),
    'check_license_status' : IDL.Func([], [IDL.Bool], ['query']),
    'claimReward' : IDL.Func([], [], []),
    'create_bid_invoice' : IDL.Func([Side, IDL.Nat], [CreateInvoiceResult], []),
    'create_invoice' : IDL.Func([], [CreateInvoiceResult], []),
    'deposit' : IDL.Func([DepositArgs], [Result_3], []),
    'expireMarket' : IDL.Func([], [], []),
    'getBalances' : IDL.Func(
        [IDL.Principal],
        [IDL.Record({ 'tokenA' : IDL.Nat, 'tokenB' : IDL.Nat })],
        ['query'],
      ),
    'getBidders' : IDL.Func(
        [],
        [
          IDL.Record({
            'long' : IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat)),
            'short' : IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat)),
          }),
        ],
        ['query'],
      ),
    'getContractBalance' : IDL.Func([], [IDL.Nat64], []),
    'getCurrentPhase' : IDL.Func([], [Phase], ['query']),
    'getCyclesBalance' : IDL.Func([], [IDL.Nat], ['query']),
    'getMarketDetails' : IDL.Func(
        [],
        [
          IDL.Record({
            'resolved' : IDL.Bool,
            'oracleDetails' : OracleDetails,
            'positions' : Position,
          }),
        ],
        ['query'],
      ),
    'getOwner' : IDL.Func([], [IDL.Principal], ['query']),
    'getTotalDeposit' : IDL.Func([], [IDL.Nat], ['query']),
    'getUserPosition' : IDL.Func(
        [IDL.Principal],
        [IDL.Record({ 'long' : IDL.Nat, 'short' : IDL.Nat })],
        ['query'],
      ),
    'get_icp_usd_exchange' : IDL.Func([], [IDL.Text], []),
    'get_invoice' : IDL.Func([IDL.Nat], [IDL.Opt(Invoice)], ['query']),
    'hasUserClaimed' : IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    'resolveMarket' : IDL.Func([], [], []),
    'startTrading' : IDL.Func([], [], []),
    'takeInPayment' : IDL.Func([IDL.Principal, IDL.Principal], [Result_2], []),
    'takeOutPayment' : IDL.Func([IDL.Text, IDL.Nat64], [Result_2], []),
    'textToFloat' : IDL.Func([IDL.Text], [IDL.Float64], []),
    'toBlobAccountId' : IDL.Func(
        [IDL.Principal, IDL.Vec(IDL.Nat8)],
        [IDL.Vec(IDL.Nat8)],
        [],
      ),
    'toPaymentBlobAccountId' : IDL.Func(
        [IDL.Principal, IDL.Principal],
        [IDL.Vec(IDL.Nat8)],
        [],
      ),
    'toSubAccount' : IDL.Func([IDL.Principal], [IDL.Vec(IDL.Nat8)], []),
    'transfer' : IDL.Func([TransferArgs], [Result_1], []),
    'transform' : IDL.Func(
        [TransformArgs],
        [CanisterHttpResponsePayload],
        ['query'],
      ),
    'verify_invoice' : IDL.Func([IDL.Nat], [VerifyInvoiceResult], []),
    'withdraw' : IDL.Func([], [], []),
    'withdrawICP' : IDL.Func([WithdrawArgs], [Result], []),
  });
  return BinaryOptionMarket;
};
export const init = ({ IDL }) => { return []; };
