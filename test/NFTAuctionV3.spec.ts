/* eslint-disable camelcase */
import { expect } from "chai";
import { ethers } from "hardhat";
import { MockNFT__factory, NFTAuctionV3__factory } from "../typechain";

describe("NFTAuctionV3", function () {
  it("Should take highest bid and send fee", async function () {
    const [signer, buyer, feeReceiver] = await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTAuctionV3 = (await ethers.getContractFactory(
      "NFTAuctionV3"
    )) as NFTAuctionV3__factory;

    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTAuctionV3.deploy();
    await auction.deployed();

    const auctionTokenId = 1;

    await auctionCollection.mint(signer.address, auctionTokenId);

    await auctionCollection.approve(auction.address, auctionTokenId);

    const price = ethers.constants.WeiPerEther.mul(10);

    await auction.createNewNftAuctions(
      auctionCollection.address,
      [auctionTokenId],
      100,
      0,
      0,
      0,
      price,
      feeReceiver.address
    );

    const balanceBefore = await feeReceiver.getBalance();

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: price.sub(1),
        })
    ).to.be.revertedWith("Not enough funds to bid on NFT");

    await expect(
      auction.connect(buyer).withdrawAllFailedCreditsOf(buyer.address)
    ).to.be.revertedWith("no credits to withdraw");

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
    const NFTAuctionV3 = (await ethers.getContractFactory(
      "NFTAuctionV3"
    )) as NFTAuctionV3__factory;

    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTAuctionV3.deploy();
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
      price,
      feeReceiver.address
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

    const newEnd = timeEnd + 86400;

    await auction.updateAuctionsEnd(
      auctionCollection.address,
      [auctionTokenId],
      newEnd
    );

    const lastPrice = price.mul(2);

    await auction
      .connect(buyer)
      .makeBid(auctionCollection.address, auctionTokenId, {
        value: lastPrice,
      });

    await ethers.provider.send("evm_mine", [newEnd]);

    await auction.settleAuctions(auctionCollection.address, [auctionTokenId]);

    expect(await auctionCollection.ownerOf(auctionTokenId)).to.be.equal(
      buyer.address
    );

    const balanceAfter = await feeReceiver.getBalance();

    expect(balanceAfter.sub(balanceBefore)).to.be.deep.equal(lastPrice);

    await expect(
      auction
        .connect(buyer)
        .makeBid(auctionCollection.address, auctionTokenId, {
          value: lastPrice,
        })
    ).to.be.revertedWith("Auction does not exist");
  });

  it("Should withdraw auctions", async function () {
    const [signer, buyer, feeReceiver] = await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTAuctionV3 = (await ethers.getContractFactory(
      "NFTAuctionV3"
    )) as NFTAuctionV3__factory;

    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTAuctionV3.deploy();
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
      feeReceiver.address
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

  it("Should withdraw auctions after withdraw period", async function () {
    const [signer, buyer, stranger, feeReceiver] = await ethers.getSigners();
    const MockNFT = (await ethers.getContractFactory(
      "MockNFT"
    )) as MockNFT__factory;
    const NFTAuctionV3 = (await ethers.getContractFactory(
      "NFTAuctionV3"
    )) as NFTAuctionV3__factory;

    const auctionCollection = await MockNFT.deploy();

    const auction = await NFTAuctionV3.deploy();
    await auction.deployed();

    const auctionTokenId = 1;

    await auctionCollection.mint(signer.address, auctionTokenId);

    await auctionCollection.setApprovalForAll(auction.address, true);

    const price = ethers.constants.WeiPerEther;

    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const timeBefore = block.timestamp;
    const timeEnd = timeBefore + 345600;

    await auction.createNewNftAuctions(
      auctionCollection.address,
      [auctionTokenId],
      0,
      0,
      0,
      timeEnd,
      price,
      feeReceiver.address
    );

    await auction
      .connect(buyer)
      .makeBid(auctionCollection.address, auctionTokenId, {
        value: price,
      });

    const buyerBalanceAfterBid = await buyer.getBalance();

    await ethers.provider.send("evm_mine", [timeEnd]);

    await expect(
      auction
        .connect(stranger)
        .withdrawAuctions(auctionCollection.address, [auctionTokenId])
    ).to.be.revertedWith("Only owner can withdraw before delay");

    const withdrawPeriod = await auction.withdrawPeriod();

    await ethers.provider.send("evm_mine", [timeEnd + withdrawPeriod]);

    await auction.withdrawAuctions(auctionCollection.address, [auctionTokenId]);

    const buyerBalanceAfterWithdraw = await buyer.getBalance();

    expect(
      (await auctionCollection.balanceOf(signer.address)).toNumber()
    ).to.be.equal(1);

    expect(buyerBalanceAfterWithdraw).to.be.deep.equal(
      buyerBalanceAfterBid.add(price)
    );
  });
});
