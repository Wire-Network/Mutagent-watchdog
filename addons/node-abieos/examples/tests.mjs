import {Abieos} from "../lib/abieos.js";

export function typeTests() {

    const abieos = Abieos.getInstance();

    const typeTests = [
        {type: 'action', code: 'eosio', name: 'voteproducer', expects: 'voteproducer'},
        {type: 'action', code: 'eosio.token', name: 'transfer', expects: 'transfer'},
        {type: 'table', code: 'eosio', name: 'producers', expects: 'producer_info'},
        {type: 'table', code: 'eosio.token', name: 'stat', expects: 'currency_stats'},
        {type: 'table', code: 'eosio.msig', name: 'approvals2', expects: 'approvals_info'},
        {type: 'table', code: 'eosio.msig', name: 'proposal', expects: 'proposal'},
        {type: 'table', code: '2', name: 'null', expects: ''},
    ];

    typeTests.forEach((value, index) => {
        console.log(`[${index + 1}/${typeTests.length}] Testing ${value.type} type for ${value.code}::${value.name}`);
        try {
            const type = value.type === 'action' ?
                abieos.getTypeForAction(value.code, value.name) :
                abieos.getTypeForTable(value.code, value.name);
            if (type === value.expects) {
                console.log(`OK - ${type} === ${value.expects}`);
            } else {
                console.log(`ERROR - Got: ${type}, Expected: ${value.expects}`);
            }
        } catch (e) {
            console.log(`ERROR - ${e.message}`);
        }
    });
}
