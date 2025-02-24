"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Abieos = void 0;
const abieos = require("./abieos.node");
const { randomUUID } = require("node:crypto");
class Abieos {
    constructor() {
        if (Abieos.instance) {
            throw new Error("This class is a Singleton!");
        }
        Abieos.native = abieos;
        Abieos.instanceId = randomUUID();
    }
    static getInstance() {
        if (!Abieos.instance) {
            Abieos.instance = new Abieos();
        }
        return Abieos.instance;
    }
    stringToName(nameString) {
        return Abieos.native.string_to_name(nameString);
    }
    jsonToHex(contractName, type, json) {
        const jsonData = typeof json === 'object' ? JSON.stringify(json) : json;
        const data = Abieos.native.json_to_hex(contractName, type, jsonData);
        if (data === 'PARSING_ERROR') {
            throw new Error('failed to parse data');
        }
        else {
            return data;
        }
    }
    hexToJson(contractName, type, hex) {
        const data = Abieos.native.hex_to_json(contractName, type, hex);
        if (data) {
            try {
                return JSON.parse(data);
            }
            catch (e) {
                throw new Error('failed to parse json string: ' + data);
            }
        }
        else {
            throw new Error('failed to parse hex data');
        }
    }
    binToJson(contractName, type, buffer) {
        const data = Abieos.native.bin_to_json(contractName, type, buffer);
        if (data[0] === '{' || data[0] === '[') {
            try {
                return JSON.parse(data);
            }
            catch (e) {
                throw new Error('json parse error');
            }
        }
        else {
            throw new Error(data);
        }
    }
    loadAbi(contractName, abi) {
        if (typeof abi === 'string') {
            return Abieos.native.load_abi(contractName, abi);
        }
        else {
            if (typeof abi === 'object') {
                return Abieos.native.load_abi(contractName, JSON.stringify(abi));
            }
            else {
                throw new Error('ABI must be a String or Object');
            }
        }
    }
    loadAbiHex(contractName, abihex) {
        return Abieos.native.load_abi_hex(contractName, abihex);
    }
    getTypeForAction(contractName, actionName) {
        const result = Abieos.native.get_type_for_action(contractName, actionName);
        if (result === 'NOT_FOUND') {
            throw new Error(`[${Abieos.instanceId}] action ` + actionName + ' not found on contract ' + contractName);
        }
        else {
            return result;
        }
    }
    getTypeForTable(contractName, table_name) {
        const result = Abieos.native.get_type_for_table(contractName, table_name);
        if (result === 'NOT_FOUND') {
            throw new Error(`[${Abieos.instanceId}] table ` + table_name + ' not found on contract ' + contractName);
        }
        else {
            return result;
        }
    }
    deleteContract(contractName) {
        return Abieos.native.delete_contract(contractName);
    }
}
exports.Abieos = Abieos;
//# sourceMappingURL=abieos.js.map