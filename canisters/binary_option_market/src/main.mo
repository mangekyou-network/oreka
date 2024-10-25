import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Int "mo:base/Int";
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
import Text "mo:base/Text";
import Iter "mo:base/Iter";

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
        strikePrice : Nat;
        finalPrice : Nat;
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

    private stable var owner : Principal = Principal.fromText("aaaaa-aa");
    private var oracleDetails : OracleDetails = { strikePrice = 0; finalPrice = 0 };
    private var positions : Position = { long = 0; short = 0 };
    private var fees : MarketFees = { poolFee = 0; creatorFee = 0; refundFee = 0 };
    private var totalDeposited : Nat = 0;
    private var resolved : Bool = false;
    private var currentPhase : Phase = #Bidding;
    private let feePercentage : Nat = 10; // 10% fee on rewards

    private var longBids = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var shortBids = HashMap.HashMap<Principal, Nat>(0, Principal.equal, Principal.hash);
    private var hasClaimed = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);


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

    private func get_icp_usd_exchange() : async Float {
        let ic : Types.IC = actor ("aaaaa-aa");

        let ONE_MINUTE : Nat64 = 60;
        let current_time : Nat64 = Nat64.fromIntWrap(Time.now());
        let start_timestamp : Types.Timestamp = current_time - ONE_MINUTE;
        let end_timestamp : Types.Timestamp = current_time;
        let host : Text = "api.exchange.coinbase.com";
        let url = "https://" # host # "/products/ICP-USD/candles?start=" # Nat64.toText(start_timestamp) # "&end=" # Nat64.toText(end_timestamp) # "&granularity=" # Nat64.toText(ONE_MINUTE);

        // ... giữ nguyên phần này ...

        Cycles.add<system>(230_949_972_000);
        
        let http_response : Types.HttpResponsePayload = await ic.http_request(http_request);
        
        let response_body: Blob = Blob.fromArray(http_response.body);
        let decoded_text: Text = switch (Text.decodeUtf8(response_body)) {
            case (null) { "No value returned" };
            case (?y) { y };
        };

        // Phân tích chuỗi JSON để lấy giá đóng cửa
        let price_text = switch (Iter.toArray(Text.split(decoded_text, #text(",")))[4]) {
            case (?value) { Text.trim(value, #text("[]")) };
            case (null) { "0" };
        };
        let price : Float = switch (Float.fromText(price_text)) {
            case (?p) { p };
            case (null) { 0 };
        };

        price
    };

    // Các sự kiện được thay thế bằng các hàm ghi log
    private func logBid(side : Side, account : Principal, value : Nat) {
        Debug.print("Bid: " # debug_show(side) # " " # debug_show(account) # " " # debug_show(value));
    };

    private func logMarketResolved(finalPrice : Nat, timeStamp : Int) {
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
        assert(currentPhase == #Trading);

        let price = await get_icp_usd_exchange();
        let finalPrice = Int.abs(Float.toInt(price * 100)); // Chuyển đổi thành số nguyên không âm, giả sử 2 chữ số thập phân
        
        resolveWithFulfilledData(Nat.fromNat32(Nat32.fromIntWrap(finalPrice)), 100, Time.now());
    };

    private func resolveWithFulfilledData(rate : Nat, decimals : Nat, timestamp : Int) {
        let finalPrice = rate / decimals;
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
        assert(currentPhase == #Bidding);
        currentPhase := #Trading;
    };

    public shared(msg) func expireMarket() : async () {
        assert(msg.caller == owner);
        assert(currentPhase == #Maturity);
        assert(resolved);
        currentPhase := #Expiry;
    };
};
