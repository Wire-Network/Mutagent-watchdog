import {Serialize, ApiInterfaces, RpcInterfaces} from "../../../addons/wirejs-native";
import {Abieos} from "../../../addons/node-abieos";
import { ABI, ABIDecoder, ABIEncoder, ABISerializable, Action, API, APIClient, FetchProvider, NameType, Serializer } from "@wireio/core";
// import { PossibleTypes } from "sysio_abi";


export class MySerializer {
    public abi: ABI | null = null;
    public abieos = Abieos.getInstance();
    public storedAbis : Map<string, ABI> = new Map()

    txDec = new TextDecoder();
    txEnc = new TextEncoder();

    /** Converts abi files between binary and structured form (`abi.abi.json`) */
    public abiTypes: Map<string, Serialize.Type>;

    /** Converts transactions between binary and structured form (`transaction.abi.json`) */
    public transactionTypes: Map<string, Serialize.Type>;

    /** For all types in the abi */
    public types: Map<string, Serialize.Type>;

    constructor(abi: any){
        this.abi = ABI.from(abi);
        this.storeAbi("0", this.abi) // load legacy ABI into abieos for deserializeNative to work
        const initialTypes = Serialize.createInitialTypes();
        this.types = Serialize.getTypesFromAbi(initialTypes, abi);
        this.abiTypes = Serialize.getTypesFromAbi(Serialize.createAbiTypes());
        this.transactionTypes = Serialize.getTypesFromAbi(Serialize.createTransactionTypes());
    }

    /**
     * Using new sdk-core methods
     */
    public serialize(type: string, value: any): Uint8Array {
        if (!this.abi) throw new Error('ABI is not initialized.');
        const encoder = new ABIEncoder();
        Serializer.encode({ type, object: value, abi: this.abi, encoder });
        return encoder.getData();
    }
    /**
     * Using new sdk-core methods
     */
    public deserialize<T = ABISerializable>(type: string, payload: Uint8Array): T {
        if (!this.abi) throw new Error('ABI is not initialized.');
        try {
            const data = new ABIDecoder(payload);
            return Serializer.decode({ type, data, abi: this.abi }) as T;
        } catch (error) {
            console.error('Error deserializing message:', error.message);
            throw error;
        }
    }

    // Use Abieos to deserialize
    public deserializeNative<T = ABISerializable>(datatype: string, array: any, contract : string = "0"):  T {
        if (!this.abi) throw new Error('ABI is not initialized.');
        try {
            if (typeof array === 'string') {
                return this.abieos.hexToJson(contract, datatype, array);
            } else {
                return this.abieos.binToJson(contract, datatype, array);
            }
        } catch (e) {
            console.log('deserializeNative >>', datatype, '>>', e.message);
        }
    }


    serializeLegacy(type : string, value: any) {
        const buffer = new Serialize.SerialBuffer({
            textEncoder: this.txEnc,
            textDecoder: this.txDec,
        });
        Serialize.getType(this.types, type).serialize(buffer, value);
        return buffer.asUint8Array();
    }

    deserializeLegacy<T>(type: string, array: Uint8Array, bytesAsUint8Array = true): T {
        const buffer = new Serialize.SerialBuffer({
            textEncoder: this.txEnc,
            textDecoder: this.txDec,
            array
        });
        return Serialize.getType(this.types, type).deserialize(buffer, new Serialize.SerializerState({bytesAsUint8Array}));
    }

    /** Convert a transaction from binary. Leaves actions in hex. */
    public deserializeTransaction(transaction: Uint8Array): ApiInterfaces.Transaction {
        const buffer = new Serialize.SerialBuffer({
            textEncoder: this.txEnc,
            textDecoder: this.txDec
        });
        buffer.pushArray(transaction);
        return this.transactionTypes.get('transaction').deserialize(buffer);
    }

    deserializeAction(a : Action): Record<string, any>{
        const account = a.account.toString()
        const name = a.name.toString()
        const actionType = this.abieos.getTypeForAction(account, name);
        const deserializedAction = this.abieos.binToJson(account, actionType, Buffer.from(a.data as any, 'hex'));
        return deserializedAction
    }
    
    storeAbi(account: string, abi: ABI){
        this.abieos.loadAbi(account, abi.toJSON());
        this.storedAbis.set(account, abi)
    }
}