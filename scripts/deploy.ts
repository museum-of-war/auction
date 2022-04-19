import { ethers } from "hardhat";
// eslint-disable-next-line camelcase,node/no-missing-import
import { IERC721, IERC721__factory, NFTAuction } from "../typechain";
import { BigNumberish } from "ethers";

async function createAuction(
  auction: NFTAuction,
  collection: IERC721,
  tokenId: BigNumberish,
  feeAddress: string
) {
  await collection.approve(auction.address, tokenId);

  await auction.createNewNftAuction(
    collection.address,
    tokenId,
    ethers.constants.AddressZero,
    ethers.constants.WeiPerEther.div(100).mul(15),
    ethers.constants.WeiPerEther.mul(10),
    86400 * 5, // 5 days
    100, // 1.00%
    [feeAddress],
    [10000] // 100.00%
  );
}

async function main() {
  const firstDropAddress = "0xD3228e099E6596988Ae0b73EAa62591c875e5693";
  const georgiaAddress = "0x5DC23613fD54A87C3b8A7134534110F5180433C8";
  const prospect100Address = "0x932aEAc0eEBaA1fE8fdB53C4f81312cBA5F771A8";

  const auctionRecipientAddress = "0xEDd9Fa9ec9247699dB95De38A06f2DcbEed8423a";
  // const royaltiesAddress = "0x0c9ff692daD2553Bad91d2D73Ebb6194600B2bEf";

  const NFTAuction = await ethers.getContractFactory("NFTAuction");
  const auction = await NFTAuction.deploy([
    firstDropAddress,
    georgiaAddress,
    prospect100Address,
  ]);
  await auction.deployed();
  console.log("NFTAuction deployed to:", auction.address);

  const [signer] = await ethers.getSigners();

  const firstDropContract = IERC721__factory.connect(firstDropAddress, signer);
  const prospect100Contract = IERC721__factory.connect(
    prospect100Address,
    signer
  );

  for (let i = 1; i <= 4; i++) {
    await createAuction(auction, firstDropContract, i, auctionRecipientAddress);
  }

  for (let i = 2; i <= 12; i++) {
    await createAuction(
      auction,
      prospect100Contract,
      i,
      auctionRecipientAddress
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
