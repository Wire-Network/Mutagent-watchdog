# Wire Node Operator Software (NOS)

## Description

Handling verification of Node Operator functions, WNS ecosystem transactions, account registration, and much more.

### Clone

```bash
git clone --recursive https://github.com/Wire-Network/node-operator-software
```

## Building and running the app

### Prerequisites 

- app relies on `.env` file; please check [.env.example](env.example)

```bash
cd node-operator-software && npm ci && cd addons/node-abieos && npm run build:linux:ci && cd ../.. && npm run serve
```

#### License

[FSL-1.1-Apache-2.0](./LICENSE.md)

---

<table>
  <tr>
    <td><img src="https://wire.foundation/favicon.ico" alt="Wire Network" width="50"/></td>
    <td>
      <strong>Wire Network</strong><br>
      <a href="https://www.wire.network/">Website</a> |
      <a href="https://x.com/wire_blockchain">Twitter</a> |
      <a href="https://www.linkedin.com/company/wire-network-blockchain/">LinkedIn</a><br>
      © 2024 Wire Network. All rights reserved.
    </td>
  </tr>
</table>
