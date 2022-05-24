# @museum-of-war/auction

```shell
npm install @museum-of-war/auction
```

## Usage

```typescript
import { ethers } from "ethers";
import { AuctionVersion, NFTAuctionConnect } from "@museum-of-war/auction";

async function main() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const auction = NFTAuctionConnect(provider, "rinkeby", AuctionVersion.V3);
  console.log(auction.address);
}

main().catch((error) => {
  console.error(error);
});
```
