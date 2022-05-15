/* eslint-disable camelcase */
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

  it("Should check start and end and settle auction", async function () {
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
    ).to.be.revertedWith("Auction does not exist");

    await auction.createNewNftAuctions(
      auctionCollection.address,
      [auctionTokenId],
      0,
      0,
      timeStart,
      timeEnd,
      ethers.constants.WeiPerEther,
      feeReceiver.address,
      false
    );

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price,
        })
    ).to.be.revertedWith("Auction has not started");

    const balanceBefore = await feeReceiver.getBalance();

    await ethers.provider.send("evm_mine", [timeStart]);

    await auction
      .connect(buyer)
      .makeBid(auctionCollection.address, auctionTokenId, {
        value: price,
      });

    await ethers.provider.send("evm_mine", [timeEnd]);

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price.mul(2),
        })
    ).to.be.revertedWith("Auction has ended");

    await auction.settleAuctions(auctionCollection.address, [auctionTokenId]);

    expect(await auctionCollection.ownerOf(auctionTokenId)).to.be.equal(
      buyer.address
    );

    const balanceAfter = await feeReceiver.getBalance();

    expect(balanceAfter.sub(balanceBefore)).to.be.deep.equal(price);

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price,
        })
    ).to.be.revertedWith("Auction does not exist");
  });

  it("Should withdraw auctions", async function () {
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

    const auctionTokenIds = [1, 2, 3];

    await Promise.all(
      auctionTokenIds.map(
        async (auctionTokenId) =>
          await auctionCollection.mint(signer.address, auctionTokenId)
      )
    );

    await auctionCollection.setApprovalForAll(auction.address, true);

    const price = ethers.constants.WeiPerEther;

    await auction.createNewNftAuctions(
      auctionCollection.address,
      auctionTokenIds,
      0,
      0,
      0,
      0,
      price,
      feeReceiver.address,
      false
    );

    const receiverBalanceBefore = await feeReceiver.getBalance();
    const buyerBalanceBefore = await buyer.getBalance();

    const tx = await auction
      .connect(buyer)
      .makeBid(auctionCollection.address, auctionTokenIds[0], {
        value: price,
      });

    const receipt = await tx.wait();
    const gas = receipt.cumulativeGasUsed.mul(receipt.effectiveGasPrice);

    const buyerBalanceAfterBid = await buyer.getBalance();

    expect(buyerBalanceAfterBid).to.be.deep.equal(
      buyerBalanceBefore.sub(price).sub(gas)
    );

    await auction.withdrawAuctions(auctionCollection.address, auctionTokenIds);

    const buyerBalanceAfterWithdraw = await buyer.getBalance();

    expect(
      (await auctionCollection.balanceOf(signer.address)).toNumber()
    ).to.be.equal(auctionTokenIds.length);

    const receiverBalanceAfter = await feeReceiver.getBalance();

    expect(receiverBalanceAfter).to.be.deep.equal(receiverBalanceBefore);
    expect(buyerBalanceAfterWithdraw).to.be.deep.equal(
      buyerBalanceAfterBid.add(price)
    );
  });
});
