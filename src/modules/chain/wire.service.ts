import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APIClient, FetchProvider, API, AnyAction, ABI, NameType, Action, Transaction, PrivateKey, SignedTransaction, Asset, Name, Struct } from '@wireio/core';
import { ApiInterfaces, RpcInterfaces, Serialize } from '../../../addons/wirejs-native';
import { WireChainOptions } from 'config';

@Injectable()
export class WireService {
    public wire : APIClient;

    /** Holds information needed to serialize contract actions */
    public contracts = new Map<NameType, Serialize.Contract>();

    /** Fetched abis */
    public cachedAbis = new Map<NameType, ABI>()

    get wireChain(){
        return this.config.getOrThrow('wireChain')
    }

    get wire_config(): WireChainOptions {
        return this.config.getOrThrow('wireChains.' + this.wireChain)
    }

    get wire_key(): PrivateKey {
        return PrivateKey.from(this.wire_config.privateKeys[0])
    }

    constructor(private config: ConfigService) {
        this.wire = new APIClient({
            provider: new FetchProvider(this.wire_config.endpoint)
        });
    }

    async pushTransaction(action: Action | AnyAction | AnyAction[], sign = false): Promise<API.v1.PushTransactionResponse> {
        const info = await this.wire.v1.chain.get_info();
        const header = info.getTransactionHeader();

        const actions = Array.isArray(action) ? action : [action];
        
        const transaction = Transaction.from({
            ...header,
            actions,
        });

        if (!sign) {
            return this.wire.v1.chain.push_transaction(transaction);
        }

        const privateKey = this.wire_key;
        const signature = privateKey.signDigest(transaction.signingDigest(info.chain_id));
        const signedTransaction = SignedTransaction.from({
            ...transaction,
            signatures: [signature],
        });

        return this.wire.v1.chain.push_transaction(signedTransaction);
    }

    async anyToAction(action: AnyAction | AnyAction[]): Promise<Action[]> {
        const actionsArray = Array.isArray(action) ? action : [action];
        const actions: Action[] = []
        const knownAbis = new Map<NameType, ABI>()
        for (const act of actionsArray) {
            if (!knownAbis.has(act.account)) {
                const abi_res = await this.wire.v1.chain.get_abi(act.account)
                knownAbis.set(act.account, ABI.from(abi_res.abi))
            }
            actions.push(Action.from(act, knownAbis.get(act.account)!))
        }
        return actions
    }


    /** Get data needed to serialize actions in a contract */
    public async getContract(
        accountName: NameType,
        reload = false
    ): Promise<[Serialize.Contract, ABI]> {
        if (!reload && this.contracts.get(accountName)) 
            return [ this.contracts.get(accountName), this.cachedAbis.get(accountName) ]

        const abi = await this.getAbi(accountName, reload);
        const types = Serialize.getTypesFromAbi(Serialize.createInitialTypes(), this.convertToLegacyAbi(abi));
        const actions = new Map<string, Serialize.Type>();

        for (const { name, type } of abi.actions) 
            actions.set(name.toString(), Serialize.getType(types, type));
        
        const contract : Serialize.Contract = { types, actions };
        this.contracts.set(accountName, contract);
        return [ contract, abi ];
    }

    /** Get abi in structured form. Fetch when needed. */
    public async getAbi(accountName: NameType, reload = false): Promise<ABI> {
        return (await this.getCachedAbi(accountName, reload));
    }

    /** Get abi in both binary and structured forms. Fetch when needed. */
    public async getCachedAbi( accountName: NameType, reload = false): Promise<ABI> {
        if (!reload && this.cachedAbis.get(accountName)) {
            return this.cachedAbis.get(accountName);
        }
        try {
            const abi_res = await this.wire.v1.chain.get_abi(accountName)
            const abi : ABI = ABI.from(abi_res.abi)
            if (abi) this.cachedAbis.set(accountName, abi)
            return abi
        } catch (e: any) {
            e.message = `fetching abi for ${accountName}: ${e.message}`;
            throw e;
        }
    }

    // Convert sdk-core ABI type to legacy RpcInterfaces Abi type from wirejs-native for legacy conversions
    convertToLegacyAbi(instance: ABI): RpcInterfaces.Abi {
        const json = instance.toJSON();
        const res = {
            version: json.version,
            types: json.types.map(type => ({ new_type_name: type.new_type_name, type: type.type })),
            structs: json.structs.map(struct => ({
                name: struct.name,
                base: struct.base || "",
                fields: struct.fields.map(field => ({ name: field.name, type: field.type }))
            })),
            actions: json.actions.map(action => ({
                name: action.name,
                type: action.type,
                ricardian_contract: action.ricardian_contract || ""
            })),
            tables: json.tables.map(table => ({
                name: table.name,
                type: table.type,
                index_type: table.index_type || "",
                key_names: table.key_names || [],
                key_types: table.key_types || []
            })),
            ricardian_clauses: json.ricardian_clauses.map(clause => ({
                id: clause.id,
                body: clause.body
            })),
            error_messages: [],
            abi_extensions: [],
            variants: json.variants?.map(variant => ({
                name: variant.name,
                types: variant.types
            })),
            action_results: json.action_results?.map(result => ({
                name: result.name,
                result_type: result.result_type
            })),
            kv_tables: []
        };
        return res as RpcInterfaces.Abi
    }
};

export interface SignHash {
    sig: string;
    eth_addr: string;
}

export interface PushTransactionArgs {
    signatures: string[];
    compression?: number;
    serializedTransaction: Uint8Array;
    serializedContextFreeData?: Uint8Array;
}

export interface WNSTransferParams {
    contractAddress: string
    amountWhole: string
    amountDecimal: string
    precision: number,
    to: string
    from: string
    symbol: string
}

export type SupportedAssetType = 20 | 721 | 1155;

@Struct.type('transfer')
class Transfer extends Struct {
    @Struct.field('name') from!: Name
    @Struct.field('name') to!: Name
    @Struct.field('asset') quantity!: Asset
    @Struct.field('string') memo!: string
}

export interface WireActionDigest {
    digest: Buffer;
    digest_str: string;
    eth_digest: string;
    trx: PushTransactionArgs;
}
