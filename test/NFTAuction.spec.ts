import { expect } from "chai";
import { ethers } from "hardhat";
import { MockNFT__factory, NFTAuction__factory } from "../typechain";

describe("NFTAuction", function () {
  it("Should allow users with whitelisted NFTs to bid", async function () {
    const [signer, whitelisted, stranger] = await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTAuction = (await ethers.getContractFactory(
      "NFTAuction"
    )) as NFTAuction__factory;

    const whitelistedCollection = await MockNFT.deploy();
    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTAuction.deploy([whitelistedCollection.address]);
    await auction.deployed();

    const auctionTokenId = 1;

    await auctionCollection.mint(signer.address, auctionTokenId);

    await auctionCollection.approve(auction.address, auctionTokenId);

    await auction.createDefaultNftAuction(
      auctionCollection.address,
      auctionTokenId,
      ethers.constants.AddressZero,
      ethers.constants.WeiPerEther,
      ethers.constants.WeiPerEther.mul(100),
      [],
      []
    );

    const whitelistTokenId = 2;

    await whitelistedCollection.mint(whitelisted.address, whitelistTokenId);

    const firstBid = ethers.constants.WeiPerEther.mul(2);

    await auction
      .connect(whitelisted)
      .makeBid(
        auctionCollection.address,
        auctionTokenId,
        ethers.constants.AddressZero,
        0,
        {
          value: firstBid,
        }
      );

    expect(
      (
        await auction.nftContractAuctions(
          auctionCollection.address,
          auctionTokenId
        )
      ).nftHighestBid
    ).to.be.deep.equal(firstBid);

    await expect(
      auction
        .connect(stranger)
        .makeBid(
          auctionCollection.address,
          auctionTokenId,
          ethers.constants.AddressZero,
          0,
          {
            value: ethers.constants.WeiPerEther.mul(4),
          }
        )
    ).to.be.revertedWith("Sender has no whitelisted NFTs");
  });
});
