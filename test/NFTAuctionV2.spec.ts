import { expect } from "chai";
import { ethers } from "hardhat";
import { MockNFT__factory, NFTAuctionV2__factory } from "../typechain";

describe("NFTAuctionV2", function () {
  it("Should allow users with whitelisted NFTs to bid", async function () {
    const [signer, whitelisted, stranger] = await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTAuctionV2 = (await ethers.getContractFactory(
      "NFTAuctionV2"
    )) as NFTAuctionV2__factory;

    const whitelistedCollection = await MockNFT.deploy();
    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTAuctionV2.deploy([whitelistedCollection.address]);
    await auction.deployed();

    const auctionTokenId = 1;

    await auctionCollection.mint(signer.address, auctionTokenId);

    await auctionCollection.approve(auction.address, auctionTokenId);

    await auction.createNewNftAuctions(
      auctionCollection.address,
      [auctionTokenId],
      0,
      0,
      0,
      0,
      ethers.constants.WeiPerEther,
      signer.address,
      true
    );

    const whitelistTokenId = 2;

    await whitelistedCollection.mint(whitelisted.address, whitelistTokenId);

    const firstBid = ethers.constants.WeiPerEther.mul(2);

    await auction
      .connect(whitelisted)
      .makeBid(auctionCollection.address, auctionTokenId, {
        value: firstBid,
      });

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
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: ethers.constants.WeiPerEther.mul(4),
        })
    ).to.be.revertedWith("Sender has no whitelisted NFTs");
  });

  it("Should take highest bid and send fee", async function () {
    const [signer, buyer, feeReceiver] = await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTAuctionV2 = (await ethers.getContractFactory(
      "NFTAuctionV2"
    )) as NFTAuctionV2__factory;

    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTAuctionV2.deploy([]);
    await auction.deployed();

    const auctionTokenId = 1;

    await auctionCollection.mint(signer.address, auctionTokenId);

    await auctionCollection.approve(auction.address, auctionTokenId);

    const price = ethers.constants.WeiPerEther.mul(10);

    await auction.createNewNftAuctions(
      auctionCollection.address,
      [auctionTokenId],
      0,
      0,
      0,
      0,
      ethers.constants.WeiPerEther,
      feeReceiver.address,
      false
    );

    const balanceBefore = await feeReceiver.getBalance();

    await auction
      .connect(buyer)
      .makeBid(auctionCollection.address, auctionTokenId, {
        value: price,
      });

    await auction.takeHighestBids(auctionCollection.address, [auctionTokenId]);

    expect(await auctionCollection.ownerOf(auctionTokenId)).to.be.equal(
      buyer.address
    );

    const balanceAfter = await feeReceiver.getBalance();

    expect(balanceAfter.sub(balanceBefore)).to.be.deep.equal(price);
  });
});
