/* eslint-disable camelcase */
import { expect } from "chai";
import { ethers } from "hardhat";
import { MockNFT__factory, NFTSeller__factory } from "../typechain";

describe("NFTSeller", function () {
  it("Should allow users with whitelisted NFTs to buy tokens", async function () {
    const [signer, whitelisted, stranger, feeRecipient] =
      await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTSeller = (await ethers.getContractFactory(
      "NFTSeller"
    )) as NFTSeller__factory;

    const whitelistedCollection = await MockNFT.deploy();
    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTSeller.deploy([whitelistedCollection.address]);
    await auction.deployed();

    const auctionTokenId = 1;

    await auctionCollection.mint(signer.address, auctionTokenId);

    await auctionCollection.approve(auction.address, auctionTokenId);

    const price = ethers.constants.WeiPerEther;

    await auction.createNewNftAuctions(
      auctionCollection.address,
      [auctionTokenId],
      0,
      0,
      price,
      feeRecipient.address,
      true
    );

    const balanceBefore = await feeRecipient.getBalance();

    const whitelistTokenId = 2;

    await whitelistedCollection.mint(whitelisted.address, whitelistTokenId);

    await expect(
      auction
        .connect(stranger)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: ethers.constants.WeiPerEther.mul(4),
        })
    ).to.be.revertedWith("Sender has no whitelisted NFTs");

    await expect(
      auction.connect(stranger).withdrawAllFailedCreditsOf(stranger.address)
    ).to.be.revertedWith("no credits to withdraw");

    await auction
      .connect(whitelisted)
      .makeBid(auctionCollection.address, auctionTokenId, {
        value: price,
      });

    await expect(
      auction
        .connect(whitelisted)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price,
        })
    ).to.be.revertedWith("Sale does not exist");

    const balanceAfter = await feeRecipient.getBalance();

    expect(await auctionCollection.ownerOf(auctionTokenId)).to.be.equal(
      whitelisted.address
    );

    expect(balanceAfter.sub(balanceBefore)).to.be.deep.equal(price);
  });

  it("Should check start and end and withdraw sale", async function () {
    const [signer, buyer, feeReceiver] = await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTSeller = (await ethers.getContractFactory(
      "NFTSeller"
    )) as NFTSeller__factory;

    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTSeller.deploy([]);
    await auction.deployed();

    const auctionTokenId = 1;

    await auctionCollection.mint(signer.address, auctionTokenId);

    await auctionCollection.approve(auction.address, auctionTokenId);

    const price = ethers.constants.WeiPerEther.mul(10);

    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const timeBefore = block.timestamp;
    const timeStart = timeBefore + 86400;
    const timeEnd = timeBefore + 345600;

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price,
        })
    ).to.be.revertedWith("Sale does not exist");

    await auction.createNewNftAuctions(
      auctionCollection.address,
      [auctionTokenId],
      timeStart,
      timeEnd,
      price,
      feeReceiver.address,
      false
    );

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price,
        })
    ).to.be.revertedWith("Sale has not started");

    await ethers.provider.send("evm_mine", [timeStart]);

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price.div(10),
        })
    ).to.be.revertedWith("Not enough funds to buy NFT");

    await ethers.provider.send("evm_mine", [timeEnd]);

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price.mul(2),
        })
    ).to.be.revertedWith("Sale has ended");

    await auction.withdrawAuctions(auctionCollection.address, [auctionTokenId]);

    expect(await auctionCollection.ownerOf(auctionTokenId)).to.be.equal(
      signer.address
    );
  });

  it("Should withdraw auctions", async function () {
    const [signer, feeReceiver] = await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTSeller = (await ethers.getContractFactory(
      "NFTSeller"
    )) as NFTSeller__factory;

    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTSeller.deploy([]);
    await auction.deployed();

    const auctionTokenIds = [1, 2, 3];

    await Promise.all(
      auctionTokenIds.map(
        async (auctionTokenId) =>
          await auctionCollection.mint(signer.address, auctionTokenId)
      )
    );

    await auctionCollection.setApprovalForAll(auction.address, true);

    await auction.createNewNftAuctions(
      auctionCollection.address,
      auctionTokenIds,
      0,
      0,
      ethers.constants.WeiPerEther,
      feeReceiver.address,
      false
    );

    await auction.withdrawAuctions(auctionCollection.address, auctionTokenIds);

    expect(
      (await auctionCollection.balanceOf(signer.address)).toNumber()
    ).to.be.equal(auctionTokenIds.length);
  });
});
