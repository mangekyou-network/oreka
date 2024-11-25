import { Actor } from "@dfinity/agent";
import { binaryOptionMarketActor } from "./actor-locator";
import { Principal } from "@dfinity/principal";

// Interface defining the service contract
export interface IBinaryOptionMarketService {
    bid(side: { Long: null } | { Short: null }, amount: number | bigint): Promise<void>;
    claimReward(): Promise<void>;
    getCurrentPhase(): Promise<{ Bidding: null } | { Trading: null } | { Maturity: null } | { Expiry: null }>;
    getMarketDetails(): Promise<{
        resolved: boolean;
        oracleDetails: { finalPrice: number; strikePrice: number };
        positions: { long: bigint; short: bigint };
    }>;
    getUserPosition(principal: Principal): Promise<{ long: bigint; short: bigint }>;
    hasUserClaimed(principal: Principal): Promise<boolean>;
    getContractBalance(): Promise<bigint>;
    getTotalDeposit(): Promise<bigint>;
    getBidders(): Promise<{
        long: Array<[Principal, bigint]>;
        short: Array<[Principal, bigint]>;
    }>;
    getIcpUsdExchange(): Promise<string>;
}

// Base abstract class for market services
abstract class BaseMarketService {
    protected actor: Actor | null = null;

    abstract initialize(): Promise<void>;
    protected assertInitialized(): void {
        if (!this.actor) {
            throw new Error("Service not initialized");
        }
    }
}

// Concrete implementation
export class BinaryOptionMarketService extends BaseMarketService implements IBinaryOptionMarketService {
    private static instance: BinaryOptionMarketService;

    private constructor() {
        super();
    }

    // Singleton pattern
    public static getInstance(): BinaryOptionMarketService {
        if (!BinaryOptionMarketService.instance) {
            BinaryOptionMarketService.instance = new BinaryOptionMarketService();
        }
        return BinaryOptionMarketService.instance;
    }

    public async initialize(): Promise<void> {
        if (!this.actor) {
            this.actor = binaryOptionMarketActor;
        }
    }

    public async bid(side: { Long: null } | { Short: null }, amount: number | bigint): Promise<void> {
        this.assertInitialized();
        const bidAmount = typeof amount === 'number' ? BigInt(amount) : amount;
        return await this.actor.bid(side, bidAmount);
    }

    public async claimReward(): Promise<void> {
        this.assertInitialized();
        return await this.actor.claimReward();
    }

    public async getCurrentPhase() {
        this.assertInitialized();
        return await this.actor.getCurrentPhase();
    }

    public async getMarketDetails() {
        this.assertInitialized();
        return await this.actor.getMarketDetails();
    }

    public async getUserPosition(principal: Principal) {
        this.assertInitialized();
        return await this.actor.getUserPosition(principal);
    }

    public async hasUserClaimed(principal: Principal) {
        this.assertInitialized();
        return await this.actor.hasUserClaimed(principal);
    }

    public async getContractBalance() {
        this.assertInitialized();
        return await this.actor.getContractBalance();
    }

    public async getTotalDeposit() {
        this.assertInitialized();
        return await this.actor.getTotalDeposit();
    }

    public async getBidders() {
        this.assertInitialized();
        return await this.actor.getBidders();
    }

    public async getIcpUsdExchange() {
        this.assertInitialized();
        return await this.actor.get_icp_usd_exchange();
    }
}
