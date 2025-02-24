import { GetBlocksRequestV0 } from "sysio_abi";

export interface AppConfig {
    port : number;
    wireAccount: {
        actor: string;
        key: string;
    }
    wireChain: keyof AppConfig["wireChains"]; 
    wireChains : {
        mainnet: WireChainOptions;
        testnet: WireChainOptions;
        devnet: WireChainOptions;
        local: WireChainOptions;
    }
    sessionSecret: string;
    wireSocketConfig: WireSocketConfig
}

export interface BaseChainOptions {
    endpoint: string;
    websocket?: string;
    privateKeys?: string[];
}

export interface WireChainOptions extends BaseChainOptions {
    hyperion?: string;
}

export interface WireSocketConfig {
    streaming: boolean // Acknowledge received blocks so stream continues
    streamingOptions: GetBlocksRequestV0
    relevantActions: string[] // List of actions to listen for
    allPersonasContract: string // Contract that tracks all personas
    personasTable: string // Table that contains persona information
}