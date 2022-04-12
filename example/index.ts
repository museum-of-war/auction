import { ethers } from "ethers";
import { NFTAuctionConnect } from "@museum-of-war/auction";

async function main() {
  const ethereum = (window as any).ethereum;
  const provider = new ethers.providers.Web3Provider(ethereum, "rinkeby");
  provider.on("network", (newNetwork, oldNetwork) => {
    console.log(oldNetwork, newNetwork);
  });
  await provider.send("eth_requestAccounts", []);
  const signer = provider.getSigner();
  const auction = NFTAuctionConnect(provider);
  console.log(auction.address);
  console.log(await signer.getAddress());
}

main().catch((error) => {
  console.error(error);
});
