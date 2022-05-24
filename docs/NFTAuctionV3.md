# [NFTAuctionV3](/contracts/NFTAuctionV3.sol)

This smart contract can be used in a flexible manner to auction NFTs in a semi-manual way.
The NFT seller must be the owner of this contract.

## NFT seller can perform the following actions to auction their NFTs:

Create an auction for their NFTs and customize their auction by specifying the following:

- The minimum price of the auction.
- The auction bid period, which specifies the amount of time the auction will last after the last bid. Every time a higher bid is then met, the auction will continue again for this time.
- A bid increase percentage (specified in basis points of 10000), which determines the amount a bidder must deposit in order to become the highest bidder. Therefore, if a bid of X amount is made, the next bidder must make a bid of X + ((X*bid increase percentage)/10000).
- A fee recipient address who will receive 100% of the selling price of an auction when the auction is concluded.
- Auction start time. Bidders won't be able to make bids before the start time.
- Auction end time. Bidders won't be able to make bids after the end time. If end time is set to 0, then it will be determined after the first bid as current time + bid period.

# Bidders can perform the following actions using the NFTAuctionV3 contract:

- Make a bid on an NFT put up for auction by specifying the amount of the bid in ETH. The bidder must make a bid that is higher by the bid increase percentage if another bid has already been made.

# Additional functions available:

## Seller can:

- Withdraw their auctions. The NFTs will be tranferred to the seller and the highest bids will be returned to the bidders.
- Settle the auctions that are not ongoing. The NFTs will be tranferred to the (last) highest bidders and the highest bids will be send to the fee recipients.
- Take the highest bid amount and conclude the auctions. Same as "settle the auction", but can be done before the auction end.

## Bidders can:

- In the case of an auction where the auction bid period has expired and 1 week passed, then any user can withdraw the auction. The NFT will be send to the owner and the highest bidder will receive their ETH.
- In the case where the distribution of a bid amount has failed, the recipient of that amount can reclaim their failed credits.
 