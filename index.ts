import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import {
  NFTAuction,
  // eslint-disable-next-line camelcase
  NFTAuction__factory,
  NFTAuctionV2,
  // eslint-disable-next-line camelcase
  NFTAuctionV2__factory,
} from "./typechain";
import rinkeby from "./network/rinkeby.json";
import mainnet from "./network/mainnet.json";

enum AuctionVersion {
  V1 = 1,
  V2,
}

function NFTAuctionAddress(chainName: string, version = AuctionVersion.V1) {
  switch (version) {
    case AuctionVersion.V1:
      switch (chainName) {
        case "stage":
        case "rinkeby":
          return rinkeby.NFTAuction;
        case "prod":
        case "production":
        case "mainnet":
          return mainnet.NFTAuction;
        default:
          throw new Error(`Chain "${chainName}" not exist`);
      }
    case AuctionVersion.V2:
      switch (chainName) {
        case "stage":
        case "rinkeby":
          return rinkeby.NFTAuctionV2;
        case "prod":
        case "production":
        case "mainnet":
          return mainnet.NFTAuctionV2;
        default:
          throw new Error(`Chain "${chainName}" not exist`);
      }
  }
}

type VersionToAuction<T extends AuctionVersion> = T extends AuctionVersion.V1
  ? NFTAuction
  : T extends AuctionVersion.V2
  ? NFTAuctionV2
  : never;

function NFTAuctionConnect(
  signerOrProvider: Signer | Provider,
  chainName = "stage",
  version = AuctionVersion.V1
): VersionToAuction<typeof version> {
  return NFTAuctionConnectByAddress(
    signerOrProvider,
    NFTAuctionAddress(chainName, version),
    version
  );
}

function NFTAuctionConnectByAddress(
  signerOrProvider: Signer | Provider,
  address: string,
  version = AuctionVersion.V1
): VersionToAuction<typeof version> {
  switch (version) {
    case AuctionVersion.V1:
      return NFTAuction__factory.connect(
        address,
        signerOrProvider
      ) as NFTAuction;
    case AuctionVersion.V2:
      return NFTAuctionV2__factory.connect(
        address,
        signerOrProvider
      ) as NFTAuctionV2;
  }
}

export { NFTAuctionConnect, NFTAuctionConnectByAddress, AuctionVersion };
export type { NFTAuction, NFTAuctionV2 };
