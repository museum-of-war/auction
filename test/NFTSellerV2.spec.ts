/* eslint-disable camelcase */
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  MockNFT__factory,
  MockSFT__factory,
  NFTSellerV2__factory,
} from "../typechain";

describe("NFTSellerV2", function () {
  describe("ERC721", function () {
    it("Should allow users with whitelisted NFTs to buy tokens", async function () {
      const [signer, whitelisted, stranger, feeRecipient] =
        await ethers.getSigners();
      const MockNFT = (await ethers.getContractFactory(
        "MockNFT"
      )) as MockNFT__factory;
      const NFTSellerV2 = (await ethers.getContractFactory(
        "NFTSellerV2"
      )) as NFTSellerV2__factory;

      const whitelistedCollection = await MockNFT.deploy();
      const auctionCollection = await MockNFT.deploy();

      const auction = await NFTSellerV2.deploy([whitelistedCollection.address]);
      await auction.deployed();

      const auctionTokenId = 1;

      await auctionCollection.mint(signer.address, auctionTokenId);

      await auctionCollection.approve(auction.address, auctionTokenId);

      const price = ethers.constants.WeiPerEther;

      await auction.createNewERC721Sales(
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
          .buyTokens(auctionCollection.address, [auctionTokenId], [], {
            value: ethers.constants.WeiPerEther.mul(4),
          })
      ).to.be.revertedWith("Sender has no whitelisted NFTs");

      await expect(
        auction.connect(stranger).withdrawAllFailedCreditsOf(stranger.address)
      ).to.be.revertedWith("no credits to withdraw");

      await auction
        .connect(whitelisted)
        .buyTokens(auctionCollection.address, [auctionTokenId], [], {
          value: price,
        });

      await expect(
        auction
          .connect(whitelisted)
          .buyTokens(auctionCollection.address, [auctionTokenId], [], {
            value: price,
          })
      ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");

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
      const NFTSellerV2 = (await ethers.getContractFactory(
        "NFTSellerV2"
      )) as NFTSellerV2__factory;

      const auctionCollection = await MockNFT.deploy();

      const auction = await NFTSellerV2.deploy([]);
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
          .buyTokens(auctionCollection.address, [auctionTokenId], [], {
            value: price,
          })
      ).to.be.revertedWith("Sale does not exist");

      await auction.createNewERC721Sales(
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
          .buyTokens(auctionCollection.address, [auctionTokenId], [], {
            value: price,
          })
      ).to.be.revertedWith("Sale has not started");

      await ethers.provider.send("evm_mine", [timeStart]);

      await expect(
        auction
          .connect(buyer)
          .buyTokens(auctionCollection.address, [auctionTokenId], [], {
            value: price.div(10),
          })
      ).to.be.revertedWith("Not enough funds to buy tokens");

      await ethers.provider.send("evm_mine", [timeEnd]);

      await expect(
        auction
          .connect(buyer)
          .buyTokens(auctionCollection.address, [auctionTokenId], [], {
            value: price.mul(2),
          })
      ).to.be.revertedWith("Sale has ended");

      await auction.withdrawSales(
        auctionCollection.address,
        [auctionTokenId],
        []
      );

      expect(await auctionCollection.ownerOf(auctionTokenId)).to.be.equal(
        signer.address
      );
    });

    it("Should withdraw sales", async function () {
      const [signer, feeReceiver] = await ethers.getSigners();
      const MockNFT = (await ethers.getContractFactory(
        "MockNFT"
      )) as MockNFT__factory;
      const NFTSellerV2 = (await ethers.getContractFactory(
        "NFTSellerV2"
      )) as NFTSellerV2__factory;

      const auctionCollection = await MockNFT.deploy();

      const auction = await NFTSellerV2.deploy([]);
      await auction.deployed();

      const auctionTokenIds = [1, 2, 3];

      await Promise.all(
        auctionTokenIds.map(
          async (auctionTokenId) =>
            await auctionCollection.mint(signer.address, auctionTokenId)
        )
      );

      await auctionCollection.setApprovalForAll(auction.address, true);

      await auction.createNewERC721Sales(
        auctionCollection.address,
        auctionTokenIds,
        0,
        0,
        ethers.constants.WeiPerEther,
        feeReceiver.address,
        false
      );

      await auction.withdrawSales(
        auctionCollection.address,
        auctionTokenIds,
        []
      );

      expect(
        (await auctionCollection.balanceOf(signer.address)).toNumber()
      ).to.be.equal(auctionTokenIds.length);
    });
  });
  describe("ERC1155", function () {
    it("Should allow users with whitelisted NFTs to buy tokens", async function () {
      const [signer, whitelisted, stranger, feeRecipient] =
        await ethers.getSigners();
      const MockNFT = (await ethers.getContractFactory(
        "MockNFT"
      )) as MockNFT__factory;
      const MockSFT = (await ethers.getContractFactory(
        "MockSFT"
      )) as MockSFT__factory;
      const NFTSellerV2 = (await ethers.getContractFactory(
        "NFTSellerV2"
      )) as NFTSellerV2__factory;

      const whitelistedCollection = await MockNFT.deploy();
      const auctionCollection = await MockSFT.deploy();

      const auction = await NFTSellerV2.deploy([whitelistedCollection.address]);
      await auction.deployed();

      const auctionTokenIds = [1, 2, 3];
      const amounts = [2, 1, 3];
      const totalAmount = amounts.reduce((sum, val) => sum + val);

      await auctionCollection.mintBatch(
        signer.address,
        auctionTokenIds,
        amounts
      );

      await auctionCollection.setApprovalForAll(auction.address, true);

      const price = ethers.constants.WeiPerEther;

      await auction.createNewERC1155Sales(
        auctionCollection.address,
        auctionTokenIds,
        amounts,
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
          .buyTokens(auctionCollection.address, auctionTokenIds, amounts, {
            value: ethers.constants.WeiPerEther.mul(4).mul(totalAmount),
          })
      ).to.be.revertedWith("Sender has no whitelisted NFTs");

      await expect(
        auction.connect(stranger).withdrawAllFailedCreditsOf(stranger.address)
      ).to.be.revertedWith("no credits to withdraw");

      await auction
        .connect(whitelisted)
        .buyTokens(auctionCollection.address, auctionTokenIds, amounts, {
          value: price.mul(totalAmount),
        });

      await expect(
        auction
          .connect(whitelisted)
          .buyTokens(auctionCollection.address, auctionTokenIds, amounts, {
            value: price.mul(totalAmount),
          })
      ).to.be.revertedWith("ERC1155: insufficient balance for transfer");

      const balanceAfter = await feeRecipient.getBalance();

      expect(
        await Promise.all(
          auctionTokenIds.map((id) =>
            auctionCollection
              .balanceOf(whitelisted.address, id)
              .then((b) => b.toNumber())
          )
        )
      ).to.be.deep.equal(amounts);

      expect(balanceAfter.sub(balanceBefore)).to.be.deep.equal(
        price.mul(totalAmount)
      );
    });

    it("Should check start and end and withdraw sale", async function () {
      const [signer, buyer, feeReceiver] = await ethers.getSigners();
      const MockSFT = (await ethers.getContractFactory(
        "MockSFT"
      )) as MockSFT__factory;
      const NFTSellerV2 = (await ethers.getContractFactory(
        "NFTSellerV2"
      )) as NFTSellerV2__factory;

      const auctionCollection = await MockSFT.deploy();

      const auction = await NFTSellerV2.deploy([]);
      await auction.deployed();

      const auctionTokenId = 1;
      const amount = 1;

      await auctionCollection.mint(signer.address, auctionTokenId, amount);

      await auctionCollection.setApprovalForAll(auction.address, true);

      const price = ethers.constants.WeiPerEther.mul(10);

      const blockNumber = await ethers.provider.getBlockNumber();
      const block = await ethers.provider.getBlock(blockNumber);
      const timeBefore = block.timestamp;
      const timeStart = timeBefore + 86400;
      const timeEnd = timeBefore + 345600;

      await expect(
        auction
          .connect(buyer)
          .buyTokens(auctionCollection.address, [auctionTokenId], [amount], {
            value: price.mul(amount),
          })
      ).to.be.revertedWith("Sale does not exist");

      await auction.createNewERC1155Sales(
        auctionCollection.address,
        [auctionTokenId],
        [amount],
        timeStart,
        timeEnd,
        price,
        feeReceiver.address,
        false
      );

      await expect(
        auction
          .connect(buyer)
          .buyTokens(auctionCollection.address, [auctionTokenId], [amount], {
            value: price.mul(amount),
          })
      ).to.be.revertedWith("Sale has not started");

      await ethers.provider.send("evm_mine", [timeStart]);

      await expect(
        auction
          .connect(buyer)
          .buyTokens(auctionCollection.address, [auctionTokenId], [amount], {
            value: price.div(10),
          })
      ).to.be.revertedWith("Not enough funds to buy tokens");

      await ethers.provider.send("evm_mine", [timeEnd]);

      await expect(
        auction
          .connect(buyer)
          .buyTokens(auctionCollection.address, [auctionTokenId], [amount], {
            value: price.mul(2).mul(amount),
          })
      ).to.be.revertedWith("Sale has ended");

      await auction.withdrawSales(
        auctionCollection.address,
        [auctionTokenId],
        [amount]
      );

      expect(
        await auctionCollection.balanceOf(signer.address, auctionTokenId)
      ).to.be.equal(amount);
    });

    it("Should withdraw sales", async function () {
      const [signer, feeReceiver] = await ethers.getSigners();
      const MockSFT = (await ethers.getContractFactory(
        "MockSFT"
      )) as MockSFT__factory;
      const NFTSellerV2 = (await ethers.getContractFactory(
        "NFTSellerV2"
      )) as NFTSellerV2__factory;

      const auctionCollection = await MockSFT.deploy();

      const auction = await NFTSellerV2.deploy([]);
      await auction.deployed();

      const auctionTokenIds = [1, 2, 3];
      const amounts = [3, 2, 1];

      await auctionCollection.mintBatch(
        signer.address,
        auctionTokenIds,
        amounts
      );

      await auctionCollection.setApprovalForAll(auction.address, true);

      await auction.createNewERC1155Sales(
        auctionCollection.address,
        auctionTokenIds,
        amounts,
        0,
        0,
        ethers.constants.WeiPerEther,
        feeReceiver.address,
        false
      );

      await auction.withdrawSales(
        auctionCollection.address,
        auctionTokenIds,
        amounts
      );

      expect(
        await Promise.all(
          auctionTokenIds.map((id) =>
            auctionCollection
              .balanceOf(signer.address, id)
              .then((b) => b.toNumber())
          )
        )
      ).to.be.deep.equal(amounts);
    });
  });
});
