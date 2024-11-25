import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import HashMap "mo:base/HashMap";
import Error "mo:base/Error";
import Option "mo:base/Option";
import Blob "mo:base/Blob";
import Cycles "mo:base/ExperimentalCycles";
import Array "mo:base/Array";
import Nat8 "mo:base/Nat8";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Char "mo:base/Char";
import Result "mo:base/Result";
import Debug "mo:base/Debug";
import Hex "../../invoice/src/Hex";
import SHA224 "../../invoice/src/SHA224";
import AID "../../invoice/src/Account";


import Hash "mo:base/Hash";

import IcpLedger "canister:icp_ledger_canister";
import Invoice "canister:invoice_canister";

import Types "Types";

import TrieMap "mo:base/TrieMap";
import ICRC "./ICRC";

shared(msg) actor class BinaryOptionMarket() = self {
    type Side = {
        #Long;
        #Short;
    };

    type Phase = {
        #Bidding;
        #Trading;
        #Maturity;
        #Expiry;
    };

    type OracleDetails = {
        strikePrice : Float;
        finalPrice : Float;
    };

    type Position = {
        long : Nat;
        short : Nat;
    };

    type MarketFees = {
        poolFee : Nat;
        creatorFee : Nat;
        refundFee : Nat;
    };

    public type Error = {
        #Transfer: TransferError;
        #Other: Text;
    };

    public type TransferError = {
        #BadFee : { expected_fee : Tokens; };
        #InsufficientFunds : { balance: Tokens; };
        #TxTooOld : { allowed_window_nanos: Nat64 };
        #TxCreatedInFuture;
        #TxDuplicate : { duplicate_of: IcpLedger.BlockIndex; }
    };

    let owner: Principal = msg.caller;
    private var oracleDetails : OracleDetails = { strikePrice = 0.1; finalPrice = 0.2 };
    private var positions : Position = { long = 0; short = 0 };
    private var fees : MarketFees = { poolFee = 0; creatorFee = 0; refundFee = 0 };
    private var totalDeposited : Nat = 0;
    private var resolved : Bool = false;
    private var currentPhase : Phase = #Trading;
    private let feePercentage : Nat = 10; // 10% fee on rewards

    let gas: Nat64 = 10_000;

    private var longBids = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var shortBids = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var hasClaimed = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);

    type Tokens = {
        e8s : Nat64;
    };

    type TransferArgs = {
        amount : Tokens;
        toPrincipal : Principal;
        toSubaccount : ?IcpLedger.SubAccount;
    };

    type SubAccount = Blob;
    type AccountIdentifier = Blob;
    type Memo = Nat64;
    type TimeStamp = {
        timestamp_nanos: Nat64;
    };

  let ONE_ICP_IN_E8S = 100_000_000;

  stable var invoicesStable : [(Nat, Invoice.Invoice)] = [];
  var invoices: HashMap.HashMap<Nat, Invoice.Invoice> = HashMap.HashMap(16, Nat.equal, Hash.hash);

  stable var licensesStable : [(Principal, Bool)] = [];
  var licenses: HashMap.HashMap<Principal, Bool> = HashMap.HashMap(16, Principal.equal, Principal.hash);

    func balanceOfAccountId(blobAccountId: Blob): async IcpLedger.Tokens {
      await IcpLedger.account_balance({
        account = blobAccountId;
      });
    };

  public func toSubAccount(principal : Principal) : async [Nat8] {
    let sub_nat32byte : [Nat8] = Blob.toArray(Text.encodeUtf8(Principal.toText(principal)));
    let sub_hash_28 : [Nat8] = SHA224.sha224(sub_nat32byte);
    let sub_hash_32 = Array.append(sub_hash_28, Array.freeze(Array.init<Nat8>(4, 0)));
    sub_hash_32
  };

  public func toBlobAccountId(p : Principal, subAccount :  [Nat8]) : async Blob {
    AID.principalToSubaccount(p);
  };

   public func toPaymentBlobAccountId(controller: Principal, userPrincipal: Principal): async Blob {
        await toBlobAccountId(controller, await toSubAccount(userPrincipal));
    };

// #region create_invoice
  public shared ({caller}) func create_invoice() : async Invoice.CreateInvoiceResult {
    let invoiceCreateArgs : Invoice.CreateInvoiceArgs = {
      amount = ONE_ICP_IN_E8S * 10;
      token = {
        symbol = "ICP";
      };
      permissions = null;
      details = ?{
        description = "Example license certifying status";
        // JSON string as a blob
        meta = Text.encodeUtf8(
          "{\n" #
          "  \"seller\": \"Invoice Canister Example Dapp\",\n" #
          "  \"itemized_bill\": [\"Standard License\"],\n" #
          "}"
        );
      };
    };
    let invoiceResult = await Invoice.create_invoice(invoiceCreateArgs);
    switch(invoiceResult){
      case(#err _) {};
      case(#ok result) {
        invoices.put(result.invoice.id, result.invoice);
      };
    };
    return invoiceResult;
  };

  public shared query ({caller}) func check_license_status() : async Bool {
    let licenseResult = licenses.get(caller);
    switch(licenseResult) {
      case(null){
        return false;
      };
      case (? license){
        return license;
      };
    };
  };

  public shared query ({caller}) func get_invoice(id: Nat) : async ?Invoice.Invoice {
    invoices.get(id);
  };

  public shared ({caller}) func verify_invoice(id: Nat) : async Invoice.VerifyInvoiceResult {
    assert(currentPhase == #Bidding);
    
    let invoiceResult = invoices.get(id);
    switch(invoiceResult) {
        case(null) {
            return #err({
                kind = #Other;
                message = ?"Invoice not found";
            });
        };
        case(?invoice) {
            let verifyResult = await Invoice.verify_invoice({id = invoice.id});
            switch(verifyResult) {
                case(#err _) return verifyResult;
                case(#ok result) {
                    switch(result) {
                        case(#Paid {invoice}) {
                            invoices.put(id, invoice);
                            
                            switch(invoice.details) {
                                case(null) return #err({
                                    message = ?"Missing invoice details";
                                    kind = #Other;
                                });
                                case(?details) {
                                    let metaText = Text.decodeUtf8(details.meta);

                                    switch(metaText) {
                                        case(null) return #err({
                                            message = ?"Invalid metadata format";
                                            kind = #Other;
                                        });
                                        case(?t) {
                                            let value = invoice.amount;
                                            // Extract side from metadata (assuming it contains "Long" or "Short")
                                            if (Text.contains(t, #text("\"side\": \"Long\""))) {
                                                positions := { 
                                                    long = positions.long + value; 
                                                    short = positions.short 
                                                };
                                                longBids.put(caller, value);
                                            } else if (Text.contains(t, #text("\"side\": \"Short\""))) {
                                                positions := { 
                                                    long = positions.long; 
                                                    short = positions.short + value 
                                                };
                                                shortBids.put(caller, value);
                                            } else {
                                                return #err({
                                                    message = ?"Invalid side in metadata";
                                                    kind = #Other;
                                                });
                                            };
                                            totalDeposited += value;
                                        };
                                    };
                                };
                            };
                        };
                        case(#AlreadyPaid _) {};
                    };
                    return verifyResult;
                };
            };
        };
    };
};

    public shared func transfer(args : TransferArgs) : async Result.Result<IcpLedger.BlockIndex, Text> {
        Debug.print(
            "Transferring "
            # debug_show (args.amount)
            # " tokens to principal "
            # debug_show (args.toPrincipal)
            # " subaccount "
            # debug_show (args.toSubaccount)
        );

        let transferArgs : IcpLedger.TransferArgs = {
            memo = 0;
            amount = args.amount;
            fee = { e8s = 10_000 };
            from_subaccount = null;
            to = Principal.toLedgerAccount(args.toPrincipal, args.toSubaccount);
            created_at_time = null;
        };

        try {
            let transferResult = await IcpLedger.transfer(transferArgs);
            switch (transferResult) {
                case (#Err(transferError)) {
                    return #err("Couldn't transfer funds:\n" # debug_show (transferError));
                };
                case (#Ok(blockIndex)) { return #ok blockIndex };
            };
        } catch (error) {
            return #err("Reject message: " # Error.message(error));
        };
    };

    public query func getOwner() : async Principal {
        owner
    };

    public query func transform(raw : Types.TransformArgs) : async Types.CanisterHttpResponsePayload {
        let transformed : Types.CanisterHttpResponsePayload = {
            status = raw.response.status;
            body = raw.response.body;
            headers = [
                { name = "Content-Security-Policy"; value = "default-src 'self'" },
                { name = "Referrer-Policy"; value = "strict-origin" },
                { name = "Permissions-Policy"; value = "geolocation=(self)" },
                { name = "Strict-Transport-Security"; value = "max-age=63072000" },
                { name = "X-Frame-Options"; value = "DENY" },
                { name = "X-Content-Type-Options"; value = "nosniff" },
            ];
        };
        transformed;
    };

    public func get_icp_usd_exchange() : async Text {

        //1. DECLARE IC MANAGEMENT CANISTER
        //We need this so we can use it to make the HTTP request
        let ic : Types.IC = actor ("aaaaa-aa");

        //2. SETUP ARGUMENTS FOR HTTP GET request

        // 2.1 Setup the URL and its query parameters
        let ONE_MINUTE : Nat64 = 60;
        let start_timestamp : Types.Timestamp = 1682978460; //May 1, 2023 22:01:00 GMT
        let end_timestamp : Types.Timestamp = 1682978520;//May 1, 2023 22:02:00 GMT
        let host : Text = "api.exchange.coinbase.com";
        let url = "https://" # host # "/products/ETH-USD/candles?start=" # Nat64.toText(start_timestamp) # "&end=" # Nat64.toText(start_timestamp) # "&granularity=" # Nat64.toText(ONE_MINUTE);

        // 2.2 prepare headers for the system http_request call
        let request_headers = [
            { name = "Host"; value = host # ":443" },
            { name = "User-Agent"; value = "exchange_rate_canister" },
        ];

        // 2.2.1 Transform context
        let transform_context : Types.TransformContext = {
        function = transform;
        context = Blob.fromArray([]);
        };

        // 2.3 The HTTP request
        let http_request : Types.HttpRequestArgs = {
            url = url;
            max_response_bytes = null; //optional for request
            headers = request_headers;
            body = null; //optional for request
            method = #get;
            transform = ?transform_context;
        };

        //3. ADD CYCLES TO PAY FOR HTTP REQUEST

        //The IC specification spec says, "Cycles to pay for the call must be explicitly transferred with the call"
        //IC management canister will make the HTTP request so it needs cycles
        //See: https://internetcomputer.org/docs/current/motoko/main/cycles
        
        //The way Cycles.add() works is that it adds those cycles to the next asynchronous call
        //"Function add(amount) indicates the additional amount of cycles to be transferred in the next remote call"
        //See: https://internetcomputer.org/docs/current/references/ic-interface-spec/#ic-http_request
        Cycles.add<system>(230_949_972_000);
        
        //4. MAKE HTTPS REQUEST AND WAIT FOR RESPONSE
        //Since the cycles were added above, we can just call the IC management canister with HTTPS outcalls below
        let http_response : Types.HttpResponsePayload = await ic.http_request(http_request);
        
        //5. DECODE THE RESPONSE

        //As per the type declarations in `src/Types.mo`, the BODY in the HTTP response 
        //comes back as [Nat8s] (e.g. [2, 5, 12, 11, 23]). Type signature:
        
        //public type HttpResponsePayload = {
        //     status : Nat;
        //     headers : [HttpHeader];
        //     body : [Nat8];
        // };

        //We need to decode that [Nat8] array that is the body into readable text. 
        //To do this, we:
        //  1. Convert the [Nat8] into a Blob
        //  2. Use Blob.decodeUtf8() method to convert the Blob to a ?Text optional 
        //  3. We use a switch to explicitly call out both cases of decoding the Blob into ?Text
        let response_body: Blob = Blob.fromArray(http_response.body);
        let decoded_text: Text = switch (Text.decodeUtf8(response_body)) {
            case (null) { "No value returned" };
            case (?y) { y };
        };

        //6. RETURN RESPONSE OF THE BODY
        //The API response will looks like this:

        // ("[[1682978460,5.714,5.718,5.714,5.714,243.5678]]")

        //Which can be formatted as this
        //  [
        //     [
        //         1682978460, <-- start/timestamp
        //         5.714, <-- low
        //         5.718, <-- high
        //         5.714, <-- open
        //         5.714, <-- close
        //         243.5678 <-- volume
        //     ],
        // ]

        Debug.print("Decoded text: " # decoded_text);

        // Loại bỏ dấu ngoặc vuông ngoài cùng
        let trimmed_text = Text.trim(decoded_text, #text("[]"));
        
        // Tách các giá trị trong mảng
        let values = Iter.toArray(Text.split(trimmed_text, #text(",")));

        values[4]
    };

    // Các sự kiện được thay thế bằng các hàm ghi log
    private func logBid(side : Side, account : Principal, value : Nat) {
        Debug.print("Bid: " # debug_show(side) # " " # debug_show(account) # " " # debug_show(value));
    };

    private func logMarketResolved(finalPrice : Float, timeStamp : Int) {
        Debug.print("MarketResolved: " # debug_show(finalPrice) # " " # debug_show(timeStamp));
    };

    private func logRewardClaimed(account : Principal, value : Nat) {
        Debug.print("RewardClaimed: " # debug_show(account) # " " # debug_show(value));
    };

    private func logWithdrawal(user : Principal, amount : Nat) {
        Debug.print("Withdrawal: " # debug_show(user) # " " # debug_show(amount));
    };

    public shared(msg) func bid(side : Side, value : Nat) : async Result.Result<Text, Text> {
        assert(currentPhase == #Bidding);
        assert(value > 0);

        // Create deposit arguments
        let depositArgs : DepositArgs = {
            spender_subaccount = null;
            token = Principal.fromText("bd3sg-teaaa-aaaaa-qaaba-cai"); // ICP Ledger principal
            from = {
                owner = msg.caller;
                subaccount = null;
            };
            amount = value;
            fee = null; // Let the token canister determine the fee
            memo = ?Text.encodeUtf8("Binary Option Market Bid");
            created_at_time = null;
        };

        // Attempt deposit
        let depositResult = await deposit(depositArgs);
        
        switch (depositResult) {
            case (#err(error)) {
                return #err("Deposit failed: " # debug_show(error));
            };
            case (#ok(blockIndex)) {
                // Update positions based on side
                switch (side) {
                    case (#Long) {
                        positions := { 
                            long = positions.long + value; 
                            short = positions.short 
                        };
                        longBids.put(msg.caller, value);
                    };
                    case (#Short) {
                        positions := { 
                            long = positions.long; 
                            short = positions.short + value 
                        };
                        shortBids.put(msg.caller, value);
                    };
                };

                totalDeposited += value;
                logBid(side, msg.caller, value);
                
                return #ok("Bid placed successfully. Block index: " # Nat.toText(blockIndex));
            };
        };
    };

    public shared(msg) func resolveMarket() : async () {
        assert(msg.caller == owner);
        assert(currentPhase == #Bidding);

        let price = await get_icp_usd_exchange();
        let finalPrice = await textToFloat(price);
        
        resolveWithFulfilledData(finalPrice, Time.now());
    };

    private func resolveWithFulfilledData(rate : Float, timestamp : Int) {
        let finalPrice = rate;
        oracleDetails := { strikePrice = oracleDetails.strikePrice; finalPrice = finalPrice };

        resolved := true;
        currentPhase := #Maturity;

        logMarketResolved(finalPrice, timestamp);
    };

    public shared(msg) func claimReward() : async () {
        assert(currentPhase == #Expiry);
        assert(resolved);
        assert(Option.isNull(hasClaimed.get(msg.caller)));

        let finalPrice = oracleDetails.finalPrice;

        let winningSide = if (finalPrice >= oracleDetails.strikePrice) #Long else #Short;

        let userDeposit = switch (winningSide) {
            case (#Long) Option.get(longBids.get(msg.caller), 0);
            case (#Short) Option.get(shortBids.get(msg.caller), 0);
        };

        let totalWinningDeposits = switch (winningSide) {
            case (#Long) positions.long;
            case (#Short) positions.short;
        };

        assert(userDeposit > 0);

        let reward = (userDeposit * totalDeposited) / totalWinningDeposits;
        let fee = (reward * feePercentage) / 100;
        let finalReward = if (reward > fee) { reward - fee } else { 0 };

        hasClaimed.put(msg.caller, true);

        // await transferICP(msg.caller, finalReward);
        let transferArgs : TransferArgs = {
            amount = { e8s = Nat64.fromNat(finalReward) };
            toPrincipal = msg.caller;
            toSubaccount = null; // or specify a subaccount if needed
        };
        let transferResult = await transfer(transferArgs);
        switch (transferResult) {
            case (#err(error)) {
                Debug.print("Transfer failed: " # debug_show(error));
            };
            case (#ok(blockIndex)) {
                Debug.print("Transfer successful, block index: " # debug_show(blockIndex));
            };
        };

        logRewardClaimed(msg.caller, finalReward);
    };

    public shared(msg) func withdraw() : async () {
        assert(msg.caller == owner);
        let amount = 0; // Cần triển khai cách lấy số dư của canister
        assert(amount > 0);

        // Trong Motoko, chúng ta cần triển khai một cách khác để chuyển tiền
        // Ví dụ: sử dụng ledger canister
        // await transferICP(msg.caller, amount);

        logWithdrawal(msg.caller, amount);
    };

    private func requestPriceFeed() : async () {
        // Cần triển khai cách gọi oracle canister để lấy giá
    };

    public shared(msg) func startTrading() : async () {
        assert(owner == msg.caller);
        assert(currentPhase == #Trading);
        currentPhase := #Bidding;
    };

    public shared(msg) func expireMarket() : async () {
        assert(msg.caller == owner);
        assert(currentPhase == #Maturity);
        assert(resolved);
        currentPhase := #Expiry;
    };

    public shared(msg) func changeStrikePrice(newStrikePrice : Float) : async () {
        assert(msg.caller == owner);
        oracleDetails := { strikePrice = newStrikePrice; finalPrice = oracleDetails.finalPrice };
    };

    public func takeInPayment(controller: Principal, userPrincipal: Principal): async Result.Result<(IcpLedger.BlockIndex, IcpLedger.Tokens), Error> {
        let subAccount = await toSubAccount(userPrincipal);
        let paymentBlobAccountId = await toPaymentBlobAccountId(controller, userPrincipal);
        let accountBalance = await balanceOfAccountId(paymentBlobAccountId);

        if (gas > accountBalance.e8s) return #err(#Transfer(#BadFee({expected_fee={e8s=gas}})));

        let transferAmount = {e8s = accountBalance.e8s-gas};

        let args : IcpLedger.TransferArgs = {
            memo = 0;
            amount = transferAmount;
            fee = {e8s=gas};
            from_subaccount = ?Blob.fromArray(subAccount);
            to = await controllerAccountId(controller);
            created_at_time = null;
        };
        
        switch(await IcpLedger.transfer(args)) {
            case (#Err(e)) return #err(#Transfer(e));
            case (#Ok(o)) return #ok(o, transferAmount);
        };
    };

    public func takeOutPayment(textAccountId: Text, amountE8s: Nat64): async Result.Result<(IcpLedger.BlockIndex, IcpLedger.Tokens), Error> {
        if (gas > amountE8s) return #err(#Transfer(#BadFee({expected_fee={e8s=gas}})));

        let blobAccountId = switch (Hex.decode(textAccountId)) {
            case (#ok(decoded)) Blob.fromArray(decoded);
            case (#err(_)) return #err(#Other("Bad address"));
        };

        let transferAmount = {e8s = amountE8s-gas};

        let args : IcpLedger.TransferArgs = {
            memo = 0;
            amount = transferAmount;
            fee = {e8s=gas};
            from_subaccount = null;
            to = blobAccountId;
            created_at_time = null;
        };

        switch(await IcpLedger.transfer(args)) {
            case (#Err(e)) return #err(#Transfer(e));
            case (#Ok(o)) return #ok(o, transferAmount);
        };
    };

    private func controllerAccountId(controller: Principal) : async AccountIdentifier {
        Principal.toLedgerAccount(controller, null);
    };

    /// VIEW FUNCTIONS

    public query func getCyclesBalance() : async Nat {
        Debug.print("Main balance: " # debug_show(Cycles.balance()));
        Cycles.balance()
    };

    public func getContractBalance() : async Nat64 {
        let account_id = await IcpLedger.account_identifier({ owner = Principal.fromText("bkyz2-fmaaa-aaaaa-qaaaq-cai"); subaccount = null });
        let balance = await IcpLedger.account_balance({ account = account_id });
        return balance.e8s;
    };

    public query func getTotalDeposit() : async Nat {
        totalDeposited
    };

    public query func getBidders() : async {long: [(Principal, Nat)]; short: [(Principal, Nat)]} {
        {
            long = Iter.toArray(longBids.entries());
            short = Iter.toArray(shortBids.entries());
        }
    };

    public query func getCurrentPhase() : async Phase {
        currentPhase
    };

    public query func getMarketDetails() : async {
        oracleDetails: OracleDetails;
        positions: Position;
        resolved: Bool;
    } {
        {
            oracleDetails;
            positions;
            resolved;
        }
    };

    public query func getUserPosition(caller : Principal) : async {long: Nat; short: Nat} {
        {
            long = Option.get(longBids.get(caller), 0);
            short = Option.get(shortBids.get(caller), 0);
        }
    };

    public query func hasUserClaimed(caller : Principal) : async Bool {
        Option.get(hasClaimed.get(caller), false)
    };

    private func textToNat(txt : Text) : async (Nat) {
        assert(txt.size() > 0);
        let chars = txt.chars();

        var num : Nat = 0;
        for (c in chars) {
            switch (Char.toNat32(c)) {
                case (d) {
                    if (d >= 48 and d <= 57) {
                        num := num * 10 + Nat32.toNat(d - 48);
                    } else {
                        Debug.print("Invalid character in input: " # debug_show(c));
                        assert(false);
                    };
                };
            };
        };

        num
    };

    public func textToFloat(t : Text) : async Float {

        var i : Float = 1;
        var f : Float = 0;
        var isDecimal : Bool = false;

        for (c in t.chars()) {
        if (Char.isDigit(c)) {
            let charToNat : Nat64 = Nat64.fromNat(Nat32.toNat(Char.toNat32(c) -48));
            let natToFloat : Float = Float.fromInt64(Int64.fromNat64(charToNat));
            if (isDecimal) {
            let n : Float = natToFloat / Float.pow(10, i);
            f := f + n;
            } else {
            f := f * 10 + natToFloat;
            };
            i := i + 1;
        } else {
            if (Char.equal(c, '.') or Char.equal(c, ',')) {
            f := f / Float.pow(10, i); // Force decimal
            f := f * Float.pow(10, i); // Correction
            isDecimal := true;
            i := 1;
            } else {
            throw Error.reject("NaN");
            };
        };
        };

        return f;
    };

    public shared ({caller}) func create_bid_invoice(side: Side, amount: Nat) : async Invoice.CreateInvoiceResult {
        assert(currentPhase == #Bidding);
        assert(amount > 0);
        
        let invoiceCreateArgs : Invoice.CreateInvoiceArgs = {
            amount = amount;
            token = {
                symbol = "ICP";
            };
            permissions = null;
            details = ?{
                description = "Binary Option Market Bid";
                meta = Text.encodeUtf8("{\n" #
                    "  \"side\": \"" # (switch(side) { case(#Long) "Long"; case(#Short) "Short" }) # "\",\n" #
                    "  \"bidder\": \"" # Principal.toText(caller) # "\",\n" #
                    "  \"amount\": " # Nat.toText(amount) # "\n" #
                    "}")
            };
        };
        
        let invoiceResult = await Invoice.create_invoice(invoiceCreateArgs);
        switch(invoiceResult) {
            case(#err _) {};
            case(#ok result) {
                invoices.put(result.invoice.id, result.invoice);
            };
        };
        return invoiceResult;
    };

    // Add new state variables for token balances
    private var balancesA = TrieMap.TrieMap<Principal, Nat>(Principal.equal, Principal.hash);
    private var balancesB = TrieMap.TrieMap<Principal, Nat>(Principal.equal, Principal.hash);
    private stable var stableBalancesA : ?[(Principal, Nat)] = null;
    private stable var stableBalancesB : ?[(Principal, Nat)] = null;

    public query func getBalances(user: Principal) : async {tokenA: Nat; tokenB: Nat} {
        {
            tokenA = Option.get(balancesA.get(user), 0);
            tokenB = Option.get(balancesB.get(user), 0);
        }
    };

    // Add new types for deposit functionality
    public type DepositArgs = {
        spender_subaccount : ?Blob;
        token : Principal;
        from : ICRC.Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };

    public type DepositError = {
        #TransferFromError : ICRC.TransferFromError;
    };

    // Add deposit function
    public shared (msg) func deposit(args : DepositArgs) : async Result.Result<Nat, DepositError> {
        let token : ICRC.Actor = actor (Principal.toText(args.token));
        let balances = which_balances(args.token);

        let fee = switch (args.fee) {
            case (?f) { f };
            case (null) { await token.icrc1_fee() };
        };

        let transfer_result = await token.icrc2_transfer_from({
            spender_subaccount = args.spender_subaccount;
            from = args.from;
            to = { owner = Principal.fromText("bkyz2-fmaaa-aaaaa-qaaaq-cai"); subaccount = null };
            amount = args.amount;
            fee = ?fee;
            memo = args.memo;
            created_at_time = args.created_at_time;
        });

        let block_height = switch (transfer_result) {
            case (#Ok(block_height)) { block_height };
            case (#Err(err)) { return #err(#TransferFromError(err)) };
        };

        let sender = args.from.owner;
        let old_balance = Option.get(balances.get(sender), 0 : Nat);
        balances.put(sender, old_balance + args.amount);

        #ok(block_height)
    };

    // Add withdraw functionality
    public type WithdrawArgs = {
        token : Principal;
        to : ICRC.Account;
        amount : Nat;
        fee : ?Nat;
        memo : ?Blob;
        created_at_time : ?Nat64;
    };

    public type WithdrawError = {
        #InsufficientFunds : { balance : ICRC.Tokens };
        #TransferError : ICRC.TransferError;
    };

    public shared (msg) func withdrawICP(args : WithdrawArgs) : async Result.Result<Nat, WithdrawError> {
        let token : ICRC.Actor = actor (Principal.toText(args.token));
        let balances = which_balances(args.token);

        let fee = switch (args.fee) {
            case (?f) { f };
            case (null) { await token.icrc1_fee() };
        };

        let old_balance = Option.get(balances.get(msg.caller), 0 : Nat);
        if (old_balance < args.amount + fee) {
            return #err(#InsufficientFunds { balance = old_balance });
        };

        let new_balance = old_balance - args.amount - fee;
        if (new_balance == 0) {
            balances.delete(msg.caller);
        } else {
            balances.put(msg.caller, new_balance);
        };

        let transfer_result = await token.icrc1_transfer({
            from_subaccount = null;
            to = args.to;
            amount = args.amount;
            fee = ?fee;
            memo = args.memo;
            created_at_time = args.created_at_time;
        });

        let block_height = switch (transfer_result) {
            case (#Ok(block_height)) { block_height };
            case (#Err(err)) {
                let b = Option.get(balances.get(msg.caller), 0 : Nat);
                balances.put(msg.caller, b + args.amount + fee);
                return #err(#TransferError(err));
            };
        };

        #ok(block_height)
    };

    // Add helper function for balance management
    private func which_balances(t : Principal) : TrieMap.TrieMap<Principal, Nat> {
        // You'll need to define your token principals
        let token_a = Principal.fromText("bd3sg-teaaa-aaaaa-qaaba-cai"); // Replace with actual token principal
        let token_b = Principal.fromText("bd3sg-teaaa-aaaaa-qaaba-cai"); // Replace with actual token principal
        
        if (t == token_a) {
            balancesA
        } else if (t == token_b) {
            balancesB
        } else {
            Debug.trap("invalid token canister");
        }
    };

    // Update system functions to handle new stable storage
    system func preupgrade() {
        // Existing preupgrade logic
        invoicesStable := Iter.toArray(invoices.entries());
        
        // Add new balance storage
        stableBalancesA := ?Iter.toArray(balancesA.entries());
        stableBalancesB := ?Iter.toArray(balancesB.entries());
    };

    system func postupgrade() {
        // Existing postupgrade logic
        invoices := HashMap.fromIter(Iter.fromArray(invoicesStable), 16, Nat.equal, Hash.hash);
        invoicesStable := [];
        
        // Add new balance restoration
        switch (stableBalancesA) {
            case (null) {};
            case (?entries) {
                balancesA := TrieMap.fromEntries<Principal, Nat>(entries.vals(), Principal.equal, Principal.hash);
                stableBalancesA := null;
            };
        };

        switch (stableBalancesB) {
            case (null) {};
            case (?entries) {
                balancesB := TrieMap.fromEntries<Principal, Nat>(entries.vals(), Principal.equal, Principal.hash);
                stableBalancesB := null;
            };
        };
    };


};
