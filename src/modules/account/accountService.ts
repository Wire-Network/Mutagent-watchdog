import { Inject, Injectable } from '@nestjs/common';
import { AnyAction, API, Name, PermissionLevel } from '@wireio/core';
import { WireService } from '../chain/wire.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccountService {

    constructor( 
        private chain: WireService ) { }

    async signup(eth_address: string, user_public_key: string): Promise<API.v1.PushTransactionResponse> {
        try {
            const parent: Name = Name.from('eosio') // todo update namespace
            const authorization: PermissionLevel[] = [PermissionLevel.from({ actor: parent, permission: 'active', })]
            const username = addressToWireName(eth_address)
            const actions: AnyAction[] = [{
                authorization,
                account: 'eosio',
                name: 'newaccount',
                data: {
                    creator: parent, name: username,
                    owner: {
                        threshold: 1, keys: [{
                            key: user_public_key, weight: 1
                        }], accounts: [], waits: []
                    },
                    active: {
                        threshold: 1, keys: [{
                            key: user_public_key, weight: 1
                        }], accounts: [], waits: []
                    }
                }
            },
            { // Buy ram for new account
                account: parent, name: 'buyrambytes', authorization,
                data: {
                    payer: parent, receiver: username, bytes: 2000
                }
            },
            { // Stake CPU and NET for new account
                account: parent, name: 'delegatebw', authorization,
                data: {
                    from: parent, receiver: username,
                    stake_net_quantity: '0.0000 SYS',
                    stake_cpu_quantity: '0.0000 SYS',
                    transfer: false,
                }
            }]

            return this.chain.pushTransaction(actions)
        }
        catch (err: any) {
            console.log("Error on newaccount:", err);
            throw new Error(err)
        }
    }
}

/**
 * Given a hex string of an address, returns a valid wire name. Takes the first and last 4 bytes ( 8 characters from each end ) and converts them to a base32 string.
 *
 * Note: This implementation has a nearly impossible chance of collisions. Reference: https://vanity-eth.tk/
 *
 * @param address Hex formatted string of an address. '0x' prefix is optional, will be pruned.
 * @returns A valid Wire name generated from the address.
 */
export const addressToWireName = (address: string) => {
    if (![40, 42].includes(address?.length))
        throw new Error('not valid address length');
    let addr = address.includes('0x') ? address.slice(2) : address;
    if (addr[40] !== '0') addr = addr.slice(0, -1) + '0';
    const int = BigInt('0x' + addr.slice(0, 8) + addr.slice(-8));

    const charMap = '.12345abcdefghijklmnopqrstuvwxyz';
    const str: any[] = [];
    let tmp = BigInt.asUintN(64, int);

    for (let i = 0; i <= 12; ++i) {
        const bigiAnd = BigInt(i === 0 ? 0x0f : 0x1f);
        const idx = tmp & bigiAnd;
        str[12 - i] = charMap[Number(idx.toString())];
        const bigi = BigInt(i === 0 ? 4 : 5);
        tmp = tmp >> bigi;
    }

    return str.join('').replace(/\.+$/g, '');
};
