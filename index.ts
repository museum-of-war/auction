import { Signer } from "ethers";
import { Provider } from "@ethersproject/providers";
import {
  NFTAuction,
  // eslint-disable-next-line camelcase
  NFTAuction__factory,
  NFTAuctionV2,
  // eslint-disable-next-line camelcase
  NFTAuctionV2__factory,
  NFTAuctionV3,
  // eslint-disable-next-line camelcase
  NFTAuctionV3__factory,
  NFTSeller,
  // eslint-disable-next-line camelcase
  NFTSeller__factory,
  NFTSellerV2,
  // eslint-disable-next-line camelcase
  NFTSellerV2__factory,
} from "./typechain";
import rinkeby from "./network/rinkeby.json";
import mainnet from "./network/mainnet.json";

enum AuctionVersion {
  V1 = 1,
  V2,
  V3,
  Seller,
  SellerV2,
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
    case AuctionVersion.V3:
      switch (chainName) {
        case "stage":
        case "rinkeby":
          return rinkeby.NFTAuctionV3;
        case "prod":
        case "production":
        case "mainnet":
          return mainnet.NFTAuctionV3;
        default:
          throw new Error(`Chain "${chainName}" not exist`);
      }
    case AuctionVersion.Seller:
      switch (chainName) {
        case "stage":
        case "rinkeby":
          return rinkeby.NFTSeller;
        case "prod":
        case "production":
        case "mainnet":
          return mainnet.NFTSeller;
        default:
          throw new Error(`Chain "${chainName}" not exist`);
      }
    case AuctionVersion.SellerV2:
      switch (chainName) {
        case "stage":
        case "rinkeby":
          return rinkeby.NFTSellerV2;
        case "prod":
        case "production":
        case "mainnet":
          throw new Error(`NFTSellerV2 is not deployed in "${chainName}" yet`);
        // return mainnet.NFTSellerV2;
        default:
          throw new Error(`Chain "${chainName}" not exist`);
      }
  }
}

type VersionToAuction<T extends AuctionVersion> = T extends AuctionVersion.V1
  ? NFTAuction
  : T extends AuctionVersion.V2
  ? NFTAuctionV2
  : T extends AuctionVersion.V3
  ? NFTAuctionV3
  : T extends AuctionVersion.Seller
  ? NFTSeller
  : T extends AuctionVersion.SellerV2
  ? NFTSellerV2
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
    case AuctionVersion.V3:
      return NFTAuctionV3__factory.connect(
        address,
        signerOrProvider
      ) as NFTAuctionV3;
    case AuctionVersion.Seller:
      return NFTSeller__factory.connect(address, signerOrProvider) as NFTSeller;
    case AuctionVersion.SellerV2:
      return NFTSellerV2__factory.connect(
        address,
        signerOrProvider
      ) as NFTSellerV2;
  }
}

export { NFTAuctionConnect, NFTAuctionConnectByAddress, AuctionVersion };
export type { NFTAuction, NFTAuctionV2, NFTAuctionV3, NFTSeller, NFTSellerV2 };
