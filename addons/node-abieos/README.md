# node-abieos

![CI](https://github.com/eosrio/node-abieos/actions/workflows/build.yml/badge.svg)
![Node-API v9 Badge](https://github.com/nodejs/abi-stable-node/blob/doc/assets/Node-API%20v9%20Badge.svg)
[![NPM version](https://img.shields.io/npm/v/@eosrio/node-abieos.svg?style=flat)](https://www.npmjs.com/package/@eosrio/node-abieos)

Node.js native binding for [abieos](https://github.com/EOSIO/abieos), with some improvements:

- Contracts can be directly updated on the map
- Added `abieos_delete_contract`

Made with ♥ by [EOS Rio](https://eosrio.io/)

----
**Only Linux is supported for now**

- Typescript typings included
- Prebuilt binary included (Clang 18 required to build)

### Install

```shell script
npm i @eosrio/node-abieos --save
```

### Usage

CommonJS
```js
const nodeAbieos = require('@eosrio/node-abieos');
```

ES Modules
```typescript
import * as nodeAbieos from "@eosrio/node-abieos";
```

Check the [/examples](https://github.com/eosrio/node-abieos/tree/master/examples) folder for implementation examples

### Building

Make sure you have Clang installed on your system:
We recommend using Clang 18 to build the `abieos` C++ library.

```bash
wget https://apt.llvm.org/llvm.sh
chmod +x llvm.sh
sudo ./llvm.sh 18
```

Clone and Build
```shell script
git clone https://github.com/eosrio/node-abieos.git
cd node-abieos
npm install
npm run build:linux
npm run build:tsc
```
