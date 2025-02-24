import { AppConfig } from "config"

export const appConfig: AppConfig = {
    port: 9000,
    wireAccount: {
        actor: process.env.WIRE_ACTOR,
        key: process.env.WIRE_KEY
    },
    wireChain: 'local',
    wireChains: {
        local: {
            endpoint: 'http://localhost:8888',
            websocket: 'ws://localhost:8080',
            privateKeys: [process.env.WIRE_PRIVATE_KEY],
        },
        mainnet: undefined,
        testnet: undefined,
        devnet: undefined,
    },
    sessionSecret: process.env.SESSION_SECRET_KEY,
    wireSocketConfig: {
        allPersonasContract: 'allpersonas',
        personasTable: 'personas',
        relevantActions: ["initpersona", "submitmsg", "finalizemsg"],
        streaming: true,
        streamingOptions: {
            start_block_num: -1, // -1 for start at head block
            end_block_num: 0xffffffff, // 0xffffffff for Indefinite stream
            max_messages_in_flight: 1000,
            have_positions: [],
            irreversible_only: false,
            fetch_block: true,
            fetch_traces: false,
            fetch_deltas: false,
        }
    }
}

export default () => (appConfig)