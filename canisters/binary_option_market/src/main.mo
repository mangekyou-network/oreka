import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Int64 "mo:base/Int64";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import HashMap "mo:base/HashMap";
import Error "mo:base/Error";
import Debug "mo:base/Debug";
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

import Types "Types";

actor BinaryOptionMarket {
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

    private stable var owner : Principal = Principal.fromText("p5ouy-t4hex-eymja-mnwlt-b62ri-3xaen-3m3n7-iwhee-qfali-gsdgd-sqe");
    private var oracleDetails : OracleDetails = { strikePrice = 0; finalPrice = 0 };
    private var positions : Position = { long = 0; short = 0 };
    private var fees : MarketFees = { poolFee = 0; creatorFee = 0; refundFee = 0 };
    private var totalDeposited : Nat = 0;
    private var resolved : Bool = false;
    private var currentPhase : Phase = #Trading;
    private let feePercentage : Nat = 10; // 10% fee on rewards

    private var longBids = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var shortBids = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var hasClaimed = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);

    public shared(msg) func initializeOwner() : async () {
        owner := msg.caller;
    };

    public query func getOwner() : async Principal {
        owner
    };

    public shared(msg) func changeOwner(newOwner : Principal) : async () {
        assert(msg.caller == owner);
        owner := newOwner;
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

    public shared(msg) func bid(side : Side, value : Nat) : async () {
        assert(currentPhase == #Bidding);
        assert(value > 0);

        switch (side) {
            case (#Long) {
                positions := { long = positions.long + value; short = positions.short };
                longBids.put(msg.caller, value);
            };
            case (#Short) {
                positions := { long = positions.long; short = positions.short + value };
                shortBids.put(msg.caller, value);
            };
        };

        totalDeposited += value;
        logBid(side, msg.caller, value);
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

        // Trong Motoko, chúng ta cần triển khai một cách khác để chuyển tiền
        // Ví dụ: sử dụng ledger canister
        // await transferICP(msg.caller, finalReward);

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
        assert(msg.caller == owner);
        assert(currentPhase == #Trading);
        currentPhase := #Bidding;
    };

    public shared(msg) func expireMarket() : async () {
        assert(msg.caller == owner);
        assert(currentPhase == #Maturity);
        assert(resolved);
        currentPhase := #Expiry;
    };

    /// VIEW FUNCTIONS

    public query func getContractBalance() : async Nat {
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
};
