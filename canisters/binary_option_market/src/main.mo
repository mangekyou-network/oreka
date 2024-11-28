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


import Hash "mo:base/Hash";

import IcpLedger "canister:icp_ledger_canister";

import Types "Types";

import TrieMap "mo:base/TrieMap";
import ICRC "./ICRC";

shared(msg) actor class BinaryOptionMarket(initStrikePrice: Float, initEndTimestamp: Nat64) = self {
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
        #TxDuplicate : { duplicate_of: BlockIndex; }
    };

    let owner: Principal = msg.caller;
    let canisterPrincipal: Principal = Principal.fromText("be2us-64aaa-aaaaa-qaabq-cai");
    let ledgerPrincipal: Principal = Principal.fromText(
    "br5f7-7uaaa-aaaaa-qaaca-cai");
    private var oracleDetails : OracleDetails = { strikePrice = initStrikePrice; finalPrice = 0 };
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

    public type BlockIndex = Nat;
    public type Subaccount = Blob;
    // Number of nanoseconds since the UNIX epoch in UTC timezone.
    public type Timestamp = Nat64;
    // Number of nanoseconds between two [Timestamp]s.
    public type Tokens = Nat;
    public type TxIndex = Nat;

    type SubAccount = Blob;

    public type Account = {
        owner : Principal;
        subaccount : ?SubAccount;
    };


    type TransferArgs = {
        from_subaccount : ?SubAccount;
        to : Account;
        amount : Tokens;
        fee : ?Tokens;
        memo : ?Blob;
        created_at_time : ?Timestamp;
    };
    
    type AccountIdentifier = Blob;
    type Memo = Nat64;
    type TimeStamp = {
        timestamp_nanos: Nat64;
    };

  let ONE_ICP_IN_E8S = 100_000_000;

  stable var licensesStable : [(Principal, Bool)] = [];
  var licenses: HashMap.HashMap<Principal, Bool> = HashMap.HashMap(16, Principal.equal, Principal.hash);

    private var balancesA = TrieMap.TrieMap<Principal, Nat>(Principal.equal, Principal.hash);
    private var balancesB = TrieMap.TrieMap<Principal, Nat>(Principal.equal, Principal.hash);
    private stable var stableBalancesA : ?[(Principal, Nat)] = null;
    private stable var stableBalancesB : ?[(Principal, Nat)] = null;


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

    func transfer(args : TransferArgs) : async Result.Result<BlockIndex, Text> {
        Debug.print(
            "Transferring "
            # debug_show (args.amount)
            # " tokens to principal "
            # debug_show (args.to)
            # " subaccount "
            # debug_show (args.from_subaccount)
        );

        try {
            let transferResult = await IcpLedger.icrc1_transfer(args);
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

    private func proxy(url: Text) : async Types.CanisterHttpResponsePayload {

        let transform_context = {
            function = transform;
            context = Blob.fromArray([]);
        };

        let request : Types.HttpRequestArgs = {
            url = url;
            max_response_bytes = null;
            headers = [];
            body = null;
            method = #get;
            transform = ?transform_context;
        };

        Cycles.add<system>(220_000_000_000);

        let ic: Types.IC = actor ("aaaaa-aa");
        let response: Types.CanisterHttpResponsePayload = await ic.http_request(request);


        response;
    };

    private func get_icp_usd_exchange() : async Text {

        //1. DECLARE IC MANAGEMENT CANISTER
        //We need this so we can use it to make the HTTP request
        let ic : Types.IC = actor ("aaaaa-aa");

        //2. SETUP ARGUMENTS FOR HTTP GET request

        // 2.1 Setup the URL and its query parameters
        let ONE_MINUTE : Nat64 = 60;
        let start_timestamp : Types.Timestamp = initEndTimestamp - 60;
        let end_timestamp : Types.Timestamp = initEndTimestamp;
        let host : Text = "api.exchange.coinbase.com";
        let url = "https://" # host # "/products/ICP-USD/candles?start=" # Nat64.toText(start_timestamp) # "&end=" # Nat64.toText(end_timestamp) # "&granularity=" # Nat64.toText(ONE_MINUTE);

        Debug.print("Request URL: " # url);

        // 2.2 prepare headers for the system http_request call
        let request_headers = [
            { name = "Host"; value = ":443" },
            { name = "User-Agent"; value = "exchange_rate_canister" },
        ];

        // 2.2.1 Transform context
        let transform_context = {
        function = transform;
        context = Blob.fromArray([]);
        };

        // 2.3 The HTTP request
        let http_request : Types.HttpRequestArgs = {
            url = url;
            max_response_bytes = null; //optional for request
            headers = [];
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

        // Check if user has already bid on the opposite side
        let hasLongBid = Option.isSome(longBids.get(msg.caller));
        let hasShortBid = Option.isSome(shortBids.get(msg.caller));

        // Prevent bidding on both sides
        switch(side) {
            case (#Long) {
                if (hasShortBid) {
                    return #err("Cannot bid on both sides");
                };
            };
            case (#Short) {
                if (hasLongBid) {
                    return #err("Cannot bid on both sides");
                };
            };
            case (_) {
                return #err("Invalid side");
            };
        };

        // Create deposit arguments
        let depositArgs : DepositArgs = {
            spender_subaccount = null;
            from = {
                owner = msg.caller;
                subaccount = null;
            };
            to = {
                owner = canisterPrincipal;
                subaccount = null;
            };
            amount = value;
            fee = ?10_000;
            memo = null;
            created_at_time = null;
        };

        try {
            let depositResult = await deposit(depositArgs);
            
            switch (depositResult) {
                case (#err(error)) {
                    return #err("Deposit failed: " # debug_show(error));
                };
                case (#ok(nat)) {
                    // Update positions based on side
                    switch (side) {
                        case (#Long) {
                            let currentLongBid = Option.get(longBids.get(msg.caller), 0);
                            positions := { 
                                long = positions.long + value; 
                                short = positions.short 
                            };
                            longBids.put(msg.caller, currentLongBid + value);
                        };
                        case (#Short) {
                            let currentShortBid = Option.get(shortBids.get(msg.caller), 0);
                            positions := { 
                                long = positions.long; 
                                short = positions.short + value 
                            };
                            shortBids.put(msg.caller, currentShortBid + value);
                        };
                        case (_) {
                            return #err("Invalid side");
                        };
                    };

                    totalDeposited += value;
                    logBid(side, msg.caller, value);
                    
                    return #ok("Bid placed successfully. Block index: " # debug_show(nat));
                };
                case (_) {
                    return #err("Unexpected deposit result");
                };
            };
        } catch (e) {
            return #err("Unexpected error: " # Error.message(e));
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

        if (not acquireLock("claim")) {
            throw Error.reject("Claim operation in progress");
        };

        try {
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

            // Mark as claimed before transfer to prevent reentrancy
            hasClaimed.put(msg.caller, true);

            let transferArgs : TransferArgs = {
                amount = finalReward;
                to = { owner = msg.caller; subaccount = null };
                from_subaccount = null;
                fee = null;
                created_at_time = null;
                memo = null;
            };
            let transferResult = await transfer(transferArgs);
            
            switch (transferResult) {
                case (#err(error)) {
                    // Rollback if transfer fails
                    hasClaimed.delete(msg.caller);
                    releaseLock("claim");
                    Debug.print("Transfer failed: " # debug_show(error));
                    throw Error.reject("Transfer failed");
                };
                case (#ok(blockIndex)) {
                    // Update all relevant values after successful transfer
                    switch (winningSide) {
                        case (#Long) {
                            // Clear losing short positions
                            shortBids.delete(msg.caller);
                            // Update winning long position
                            longBids.delete(msg.caller);
                            positions := {
                                long = positions.long - userDeposit;
                                short = positions.short;
                            };
                        };
                        case (#Short) {
                            // Clear losing long positions
                            longBids.delete(msg.caller);
                            // Update winning short position
                            shortBids.delete(msg.caller);
                            positions := {
                                long = positions.long;
                                short = positions.short - userDeposit;
                            };
                        };
                    };

                    // Update total deposited
                    totalDeposited := totalDeposited - userDeposit;
                    
                    // Clear user's balance
                    balancesA.delete(msg.caller);

                    releaseLock("claim");
                    Debug.print("Transfer successful, block index: " # debug_show(blockIndex));
                    logRewardClaimed(msg.caller, finalReward);
                };
            };
        } catch (e) {
            releaseLock("claim");
            throw e;
        };
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

    private func controllerAccountId(controller: Principal) : async AccountIdentifier {
        Principal.toLedgerAccount(controller, null);
    };

    /// VIEW FUNCTIONS

    public query func getCyclesBalance() : async Nat {
        Debug.print("Main balance: " # debug_show(Cycles.balance()));
        Cycles.balance()
    };

    public func getContractBalance() : async Nat {
        let balance = await IcpLedger.icrc1_balance_of({ owner = canisterPrincipal; subaccount = null });
        return balance;
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

    public query func getBalances(user: Principal) : async {tokenA: Nat; tokenB: Nat} {
        {
            tokenA = Option.get(balancesA.get(user), 0);
            tokenB = Option.get(balancesB.get(user), 0);
        }
    };

    // Add new types for deposit functionality
    public type DepositArgs = {
        to : Account;
        fee : ?Nat;
        spender_subaccount : ?Blob;
        from : Account;
        memo : ?Blob;
        created_at_time : ?Nat64;
        amount : Nat;
    };

    public type DepositError = {
        #TransferFromError : ICRC.TransferFromError;
    };

    // Add deposit function
    private func deposit(args : DepositArgs) : async Result.Result<Nat, Text> {
        if (not acquireLock("deposit")) {
            return #err("The function is locked");
        };
        
        try {
            let token = IcpLedger;
            let balances = which_balances(ledgerPrincipal);

            let transfer_result = await token.icrc2_transfer_from({
                spender_subaccount = args.spender_subaccount;
                from = args.from;
                to = args.to;
                amount = args.amount;
                fee = args.fee;
                memo = args.memo;
                created_at_time = args.created_at_time;
            });

            // Release lock BEFORE processing result to prevent trap
            releaseLock("deposit");

            switch (transfer_result) {
                case (#Ok(block_height)) {
                    let sender = args.from.owner;
                    let old_balance = Option.get(balances.get(sender), 0);
                    balances.put(sender, old_balance + args.amount);
                    #ok(block_height)
                };
                case (#Err(e)) { 
                    #err("Transfer failed: " # debug_show(e))
                };
            };
        } catch (e) {
            // Make sure lock is released even if we trap
            releaseLock("deposit");
            #err("Unexpected error: " # Error.message(e))
        };
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

    // Add helper function for balance management
    private func which_balances(t : Principal) : TrieMap.TrieMap<Principal, Nat> {
        // You'll need to define your token principals
        let token_a = ledgerPrincipal; // Replace with actual token principal
        let token_b = ledgerPrincipal; // Replace with actual token principal
        
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
        
        // Add new balance storage
        stableBalancesA := ?Iter.toArray(balancesA.entries());
        stableBalancesB := ?Iter.toArray(balancesB.entries());
    };

    system func postupgrade() {
        // Existing postupgrade logic
        
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

    // Simplified lock variables
    private var isDepositLocked : Bool = false;
    private var isClaimLocked : Bool = false;

    // Simplified lock functions
    private func acquireLock(lockType: Text) : Bool {
        switch(lockType) {
            case "deposit" {
                if (isDepositLocked) return false;
                isDepositLocked := true;
            };
            case "claim" {
                if (isClaimLocked) return false;
                isClaimLocked := true;
            };
            case _ { return false; };
        };
        true
    };

    private func releaseLock(lockType: Text) {
        switch(lockType) {
            case "deposit" { isDepositLocked := false; };
            case "claim" { isClaimLocked := false; };
            case _ {};
        };
    };

    public shared(msg) func forceUnlock() : async () {
        assert(msg.caller == owner);
        isDepositLocked := false;
        isClaimLocked := false;
    };

    public query func isLocked() : async {deposit: Bool; claim: Bool} {
        {
            deposit = isDepositLocked;
            claim = isClaimLocked;
        }
    };
};
