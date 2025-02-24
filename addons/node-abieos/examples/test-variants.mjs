import {Abieos} from "../lib/abieos.js";

const abieos = Abieos.getInstance();

const abi = `
{
    "version": "eosio::abi/1.1",
    "structs": [
        {
            "name": "foo",
            "fields": [
                {
                    "name": "things",
                    "type": "variant_things"
                }
            ]
        },
        {
            "name": "bar",
            "fields": [
                {
                    "name": "baz",
                    "type": "string"
                }
            ]
        }

    ],
    "variants": [
        {
            "name": "variant_things",
            "types": [
                "bar",
                "uint8"
            ]
        }
    ]
}
`;

const status = abieos.loadAbi("1", abi);
console.log(status);

const hex = abieos.jsonToHex("1", "foo", {
    things: ["uint8", 4]
});
console.log(hex);

const hex2 = abieos.jsonToHex("1", "foo", {
    things: ["bar", {baz: "moo"}]
});
console.log(hex2);

const data = abieos.hexToJson("1", "foo", hex);
console.log(data);

const data2 = abieos.hexToJson("1", "foo", hex2);
console.log(data2);
