// @ts-ignore
import { ethers } from "hardhat";

async function main() {
  const NFTAuction = await ethers.getContractFactory("NFTAuction");
  const contract = await NFTAuction.deploy();
  await contract.deployed();
  console.log("NFTAuction deployed to:", contract.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
