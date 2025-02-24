const abieos = require("./abieos.node");
const {randomUUID} = require("node:crypto");

export class Abieos {
    private static instance: Abieos;
    public static native: typeof abieos;
    private static instanceId: any;

    private constructor() {
        if (Abieos.instance) {
            throw new Error("This class is a Singleton!");
        }
        Abieos.native = abieos;
        Abieos.instanceId = randomUUID();
    }

    public static getInstance(): Abieos {
        if (!Abieos.instance) {
            Abieos.instance = new Abieos();
        }
        return Abieos.instance;
    }

    public stringToName(nameString: string): BigInteger {
        return Abieos.native.string_to_name(nameString) as BigInteger;
    }

    public jsonToHex(contractName: string, type: string, json: string | object): string {
        const jsonData = typeof json === 'object' ? JSON.stringify(json) : json
        const data: string = Abieos.native.json_to_hex(contractName, type, jsonData);
        if (data === 'PARSING_ERROR') {
            throw new Error('failed to parse data');
        } else {
            return data;
        }
    }

    public hexToJson(contractName: string, type: string, hex: string): any {
        const data = Abieos.native.hex_to_json(contractName, type, hex);
        if (data) {
            try {
                return JSON.parse(data);
            } catch (e) {
                throw new Error('failed to parse json string: ' + data);
            }
        } else {
            throw new Error('failed to parse hex data');
        }
    }

    public binToJson(contractName: string, type: string, buffer: Buffer): any {
        const data = Abieos.native.bin_to_json(contractName, type, buffer);
        if (data[0] === '{' || data[0] === '[') {
            try {
                return JSON.parse(data);
            } catch (e) {
                throw new Error('json parse error');
            }
        } else {
            throw new Error(data);
        }
    }

    public loadAbi(contractName: string, abi: string | object): boolean {
        if (typeof abi === 'string') {
            return Abieos.native.load_abi(contractName, abi) as boolean;
        } else {
            if (typeof abi === 'object') {
                return Abieos.native.load_abi(contractName, JSON.stringify(abi)) as boolean;
            } else {
                throw new Error('ABI must be a String or Object');
            }
        }
    }

    public loadAbiHex(contractName: string, abihex: string): boolean {
        return Abieos.native.load_abi_hex(contractName, abihex) as boolean;
    }

    public getTypeForAction(contractName: string, actionName: string): string {
        const result = Abieos.native.get_type_for_action(contractName, actionName);
        if (result === 'NOT_FOUND') {
            throw new Error(`[${Abieos.instanceId}] action ` + actionName + ' not found on contract ' + contractName);
        } else {
            return result;
        }
    }

    public getTypeForTable(contractName: string, table_name: string): string {
        const result = Abieos.native.get_type_for_table(contractName, table_name);
        if (result === 'NOT_FOUND') {
            throw new Error(`[${Abieos.instanceId}] table ` + table_name + ' not found on contract ' + contractName);
        } else {
            return result;
        }
    }

    public deleteContract(contractName: string): boolean {
        return Abieos.native.delete_contract(contractName) as boolean;
    }
}