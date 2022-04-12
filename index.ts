import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
// eslint-disable-next-line camelcase,node/no-missing-import
import { NFTAuction, NFTAuction__factory } from "./typechain";
// @ts-ignore
import rinkeby from "./network/rinkeby-farm.json";

function NFTAuctionAddress(chainName: string) {
  switch (chainName) {
    case "stage":
    case "rinkeby":
      return rinkeby.NFTAuction;
    default:
      throw new Error(`Chain "${chainName}" not exist`);
  }
}

function NFTAuctionConnect(
  signerOrProvider: Signer | Provider,
  chainName = "stage"
): NFTAuction {
  return NFTAuction__factory.connect(
    NFTAuctionAddress(chainName),
    signerOrProvider
  ) as NFTAuction;
}

export { NFTAuctionConnect };
