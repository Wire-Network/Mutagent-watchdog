import { ConfigService } from '@nestjs/config';
import { MySerializer } from './serializer';
import * as WebSocket from 'ws';
import { Transaction, P2P, API, Bytes, Action, AnyAction } from '@wireio/core';
import { GetBlocksRequestV0, GetStatusResultV0, MessageResult, TransactionTraceV0 } from 'sysio_abi';
import { WireChainOptions, WireSocketConfig } from 'config';
import { WireService } from './wire.service';
import * as zlib from 'zlib';
import { Injectable } from '@nestjs/common';
import { Handler, ReleventAction } from './handlers/handler';
import { PersonaModule } from './handlers/persona';
import { AISocketService } from '../ai/ai.socket';

@Injectable()
export class WireSocketService {
    private ws: WebSocket | null = null;
    private connected = false;
    private retryCount = 0;
    private readonly maxRetries = 5;
    private ser?: MySerializer
    private config: WireSocketConfig
    private chain: WireChainOptions
    private personaModule: PersonaModule;

    txDec = new TextDecoder();
    txEnc = new TextEncoder();

    contractHandlers: Map<string, Handler> = new Map();

    constructor(
        private readonly _config: ConfigService,
        private readonly wire: WireService,
        private readonly ai: AISocketService
    ) {
        this.config = this._config.get<WireSocketConfig>('wireSocketConfig')
        this.chain = this.wire.wire_config
        if (!this.chain.websocket) {
            throw new Error('WebSocket URL for Wire network is not configured.');
        }
        console.log('WireSocketService configuration:', {
            endpoint: this.chain.websocket,
            streaming: this.config.streaming,
            streamingOptions: this.config.streamingOptions
        });
        this.connect();
        
        // Create a single PersonaModule instance to handle all personas
        this.personaModule = new PersonaModule(wire, ai, this._config);
        
        // Register the handler for the allpersonas contract
        this.contractHandlers.set(this.config.allPersonasContract, this.personaModule);
    }

    /**
     * Establish a WebSocket connection.
     */
    private connect(): void {
        console.log('Attempting to connect to WebSocket:', this.chain.websocket);
        this.ws = new WebSocket(this.chain.websocket, { perMessageDeflate: false });

        this.ws.on('open', () => {
            this.connected = true;
            this.retryCount = 0;
            console.log('>>> WebSocket connection established successfully.');
        });

        this.ws.on('message', (data) => {
            console.log('>>> Received WebSocket message');
            this.onMessage(data);
        });

        this.ws.on('close', () => {
            this.connected = false;
            console.warn('>>> WebSocket connection closed. Will attempt to reconnect...');
            this.reconnect();
        });

        this.ws.on('error', (error) => {
            console.error('>>> WebSocket connection error:', error);
            this.reconnect();
        });
    }

    /**
     * Initializes the ABI from the first WebSocket message.
     */
    private initializeABI(data: WebSocket.Data): void {
        try {
            const dataString = this.txDec.decode(data as Buffer);
            const parsedAbi = JSON.parse(dataString);
            if (!parsedAbi.version || !parsedAbi.structs || !Array.isArray(parsedAbi.structs)) {
                throw new Error('Invalid ABI structure: Missing required fields.');
            }
            // Initialize my serializer with abi
            this.ser = new MySerializer(parsedAbi)
            console.log('ABI Initialized:', this.ser.abi.version);

            // Send a status request after ABI initialization
            this.send('get_status_request_v0', {});
        } catch (error) {
            console.error('Failed to initialize ABI:', error);
        }
    }

    /**
     * Handles incoming WebSocket messages.
     */
    private async onMessage(data: WebSocket.Data): Promise<void> {
        try {
            if (!this.ser) this.initializeABI(data);
            else this.processMessage(data);
        } catch (error) {
            console.error('Error handling message:', error.message);
        }
    }

    /**
     * Processes a WebSocket message after the ABI is initialized.
     */
    private processMessage(data: WebSocket.Data): void {
        const messageBuffer = new Uint8Array(data as ArrayBuffer);
        const decoded = this.ser.deserialize<MessageResult<GetStatusResultV0>>('result', messageBuffer);
        this.handleMessage(decoded[0], decoded[1]);
    }

    /**
     * Handles decoded WebSocket messages based on their type.
     */
    private handleMessage(type: string, payload: any): void {
        if (!this.isPayloadValid(type, payload)) {
            console.warn(`Invalid payload for type: ${type}. Message ignored.`);
            return;
        }
        console.log({type});
        
        switch (type) {
            case 'get_status_result_v0':
                console.log(payload);
                
                this.startBlockStream(payload.head.block_num);
                break;

            case 'get_blocks_result_v0':
                this.handleBlockStream(payload);
                break;

            default:
                console.warn(`Unhandled message type: ${type}`);
        }
    }

    /**
     * Sends a serialized message via the WebSocket.
     */
    private send(type: string, payload: any): void {
        if (!this.connected || !this.ws) {
            console.warn('Cannot send request: WebSocket not connected.');
            return;
        }
        if (!this.ser.abi) {
            console.error('Cannot send request: ABI is not initialized.');
            return;
        }
        try {
            const encodedMessage = this.ser.serialize('request', [type, payload]);
            this.ws.send(encodedMessage);
        } catch (error) {
            console.error('Error during message serialization:', error);
        }
    }

    /**
     * Handles incoming block stream messages.
     */
    private async handleBlockStream(payload: any) {
        try {
            let block: P2P.SignedBlock | null = null;
            let traces: TransactionTraceV0[] = [];
            let deltas: any[] = [];

            if (payload.block) {
                this.printProcessedBlock(payload);
                // Deserialize the signed block as before
                block = this.ser.deserializeNative<P2P.SignedBlock>('signed_block', payload.block.array);
                if (!block) throw new Error("Uncaught error deserializing block");

                if (this.config.streamingOptions.fetch_block && block.transactions.length) {
                    for (const transaction of block.transactions) {
                        // Check status and packed_trx
                        if (+transaction.status === 0 && transaction.trx[1] && transaction.trx[1].packed_trx) {
                            const compression = transaction.trx[1].compression || 0; // defaults to 0 if not present
                            let packed_trx_data = Buffer.from(transaction.trx[1].packed_trx, 'hex'); // retrieve packed trx from transaction
                            if (compression === 1) packed_trx_data = zlib.inflateSync(packed_trx_data); // decompress if compressed
                            const unpacked_trx = this.ser.deserializeLegacy<Transaction>('transaction', packed_trx_data, false); //deserialize the (uncompressed) transaction data
                            const containsRelevantAction = this.containsRelevantActions(unpacked_trx);
                            if (containsRelevantAction) {
                                console.log("RELEVANT ACTIONS FOUND >>>", unpacked_trx.actions.map(a => a.name), '\tBlock num', payload?.this_block?.block_num?.toString());
                                for (const a of unpacked_trx.actions) {
                                    console.log("Processing action:", {
                                        account: a.account.toString(),
                                        name: a.name.toString()
                                    });
                                    if (this.isRelevant(a)) {
                                        console.log("Action is relevant, deserializing...");
                                        const deserializedAction : Record<string, any> = await this.deserializeAction(a);
                                        console.log("\tAction Data:", deserializedAction);
                                        
                                        let {account, name} = a;
                                        const accountStr = account.toString();

                                        // If it's a .ai account, route directly to PersonaModule
                                        if (accountStr.endsWith('.ai')) {
                                            console.log("Routing .ai action to PersonaModule");
                                            await this.personaModule.handleAction({
                                                account,
                                                name,
                                                data: deserializedAction
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (this.config.streamingOptions.fetch_traces && payload.traces && payload.traces.length) {
                    traces = this.ser.deserializeNative<TransactionTraceV0[]>('transaction_trace[]', payload.traces.array);
                }

                if (this.config.streamingOptions.fetch_deltas && payload.deltas && payload.deltas.length) {
                    deltas = this.ser.deserializeLegacy('table_delta[]', payload.deltas.array);
                }
            }

            if (this.config.streaming) {
                // Acknowledge receipt of socket message
                this.send('get_blocks_ack_request_v0', { num_messages: 1 });
            }

        } catch (error) {
            console.error('Error deserializing block number:', payload.this_block.block_num.toString(), "-", error.message);
        }
    }

    async deserializeAction(a: Action): Promise<Record<string, any>> {
        const abi = await this.wire.getAbi(a.account)
        this.ser.storeAbi(a.account.toString(), abi)
        return this.ser.deserializeAction(a)
    }

    containsRelevantActions(unpacked_trx: Transaction): boolean {
        // Combine all actions (normal and context-free) into one array for processing
        const allActions = [
            ...unpacked_trx.actions,
            ...unpacked_trx.context_free_actions,
        ];

        // Check if any action matches the RELEVANT_ACTIONS criteria
        return allActions.some((action) => {
            return this.isRelevant(action)
        });
    }

    private isRelevant(a: ReleventAction): boolean {
        const accountStr = a.account.toString();
        const actionName = a.name.toString();
        
        console.log("Checking relevance for action:", {
            account: accountStr,
            name: actionName,
            configuredActions: this.config.relevantActions
        });

        return this.config.relevantActions.includes(actionName);
    }

    /**
     * Starts a block stream from the specified block number.
     */
    private startBlockStream(startBlockNum: number): void {
        let streamingOptions: GetBlocksRequestV0 = this.config.streamingOptions
        if (streamingOptions.start_block_num === -1) streamingOptions.start_block_num = startBlockNum
        console.log(`Starting block stream from block ${streamingOptions.start_block_num}`);
        this.send('get_blocks_request_v0', streamingOptions);
    }

    private isPayloadValid(typeName: string, payload: any): boolean {
        if (!this.ser.abi) throw new Error('ABI is not initialized.');
        const struct = this.ser.abi.structs.find((s) => s.name === typeName);
        if (!struct) {
            console.error(`Type ${typeName} not found in ABI.`);
            return false;
        }
        for (const field of struct.fields) {
            if (!(field.name in payload)) {
                console.error(`Missing expected field: ${field.name} in payload for type ${typeName}`);
                return false;
            }
        }
        return true;
    }

    /**
     * Logs the block processing information.
     */
    printProcessedBlock(payload: any): void {
        const currBlock = payload?.this_block?.block_num?.toString()
        const headBlock = payload?.head?.block_num?.toString()
        const lastBlock = payload?.last_irreversible?.block_num?.toString()

        if (currBlock == headBlock){
            console.log(
                '> Live reader block:',
                currBlock,
                '\tHead Block:',
                headBlock,
                '\tLIB:',
               lastBlock
            );          
        }
        else {
            console.log(
                '> Processing block:',
                currBlock,
                '\tHead Block:',
                headBlock,
                '\tRemaining:',
                headBlock - currBlock
            );
        }
    }

    /**
     * Retry logic for WebSocket reconnection.
     */
    private reconnect(): void {
        if (this.retryCount >= this.maxRetries) {
            console.error('Maximum reconnection attempts reached. Exiting.');
            return;
        }

        setTimeout(() => {
            console.log(`Reconnecting WebSocket... Attempt ${this.retryCount + 1}`);
            this.retryCount++;
            this.connect();
        }, 5000);
    }

    /**
     * Closes the WebSocket connection.
     */
    public close(): void {
        if (this.ws) {
            this.ws.close();
        }
    }
}

