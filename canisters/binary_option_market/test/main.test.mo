import BinaryOptionMarket "canister:binary_option_market";
import C "utils/motoko-matchers/Canister";
import M "utils/motoko-matchers/Matchers";
import T "utils/motoko-matchers/Testable";
import Principal "mo:base/Principal";
import Float "mo:base/Float";
import Debug "mo:base/Debug";

actor {
    let it = C.Tester({ batchSize = 8 });
    let strikePrice : Float = 50.0;
    let endTimestamp : Nat64 = 1735689600000000000;
    let testPrincipal = Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai");

    public shared func test() : async Text {
        // Initialization tests
        it.should("have correct initial state", func() : async C.TestResult = async {
            let details = await BinaryOptionMarket.getMarketDetails();
            let result = M.attempt(details.resolved, M.equals(T.bool(false)));
            switch(result) {
                case (#success) { #success };
                case (#fail(text)) { #fail("Initial state check failed: " # text) };
            }
        });

        it.should("start in Trading phase", func() : async C.TestResult = async {
            let phase = await BinaryOptionMarket.getCurrentPhase();
            let result = M.attempt(debug_show(phase), M.equals(T.text("#Trading")));
            switch(result) {
                case (#success) { #success };
                case (#fail(text)) { #fail("Phase check failed: " # text) };
            }
        });

        // Position Management tests
        it.should("start with zero positions", func() : async C.TestResult = async {
            let positions = await BinaryOptionMarket.getUserPosition(testPrincipal);
            let longResult = M.attempt(positions.long, M.equals(T.nat(0)));
            let shortResult = M.attempt(positions.short, M.equals(T.nat(0)));
            switch(longResult, shortResult) {
                case (#success, #success) { #success };
                case _ { #fail("Position check failed") };
            }
        });

        it.should("start with empty bidders", func() : async C.TestResult = async {
            let bidders = await BinaryOptionMarket.getBidders();
            let longResult = M.attempt(bidders.long.size(), M.equals(T.nat(0)));
            let shortResult = M.attempt(bidders.short.size(), M.equals(T.nat(0)));
            switch(longResult, shortResult) {
                case (#success, #success) { #success };
                case _ { #fail("Bidders check failed") };
            }
        });

        // Phase Transition tests
        it.should("transition from Trading to Bidding", func() : async C.TestResult = async {
            await BinaryOptionMarket.startTrading();
            let phase = await BinaryOptionMarket.getCurrentPhase();
            let result = M.attempt(debug_show(phase), M.equals(T.text("#Bidding")));
            switch(result) {
                case (#success) { #success };
                case (#fail(text)) { #fail("Phase transition failed: " # text) };
            }
        });

        // Balance Management tests
        it.should("start with zero balances", func() : async C.TestResult = async {
            let balances = await BinaryOptionMarket.getBalances(testPrincipal);
            let tokenAResult = M.attempt(balances.tokenA, M.equals(T.nat(0)));
            let tokenBResult = M.attempt(balances.tokenB, M.equals(T.nat(0)));
            switch(tokenAResult, tokenBResult) {
                case (#success, #success) { #success };
                case _ { #fail("Balance check failed") };
            }
        });

        it.should("start with zero total deposit", func() : async C.TestResult = async {
            let totalDeposit = await BinaryOptionMarket.getTotalDeposit();
            let result = M.attempt(totalDeposit, M.equals(T.nat(0)));
            switch(result) {
                case (#success) { #success };
                case (#fail(text)) { #fail("Total deposit check failed: " # text) };
            }
        });

        // Lock Management tests
        it.should("start with locks disabled", func() : async C.TestResult = async {
            let lockStatus = await BinaryOptionMarket.isLocked();
            let depositResult = M.attempt(lockStatus.deposit, M.equals(T.bool(false)));
            let claimResult = M.attempt(lockStatus.claim, M.equals(T.bool(false)));
            switch(depositResult, claimResult) {
                case (#success, #success) { #success };
                case _ { #fail("Lock status check failed") };
            }
        });

        await it.runAll()
    };
} 