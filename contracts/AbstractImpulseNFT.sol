// SPDX-License-Identifier: MIT
pragma solidity 0.8.8; // Change to 0.8.17 and compare vulnerabilities threw by Etherscan

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error Abstract__NotEnoughETH();
error Abstract__TransferFailed();
error Abstract__NotExistingTokenId();
error Abstract__BidReceivedForThisNFT();
error Abstract__NoBidReceivedForThisNFT();
error Abstract__AuctionFinishedForThisNFT();
error Abstract__AuctionStillOpenForThisNFT();
error Abstract__ContractOwnerIsNotAllowedToBid();

contract AbstractImpulseNFT is ERC721A, ReentrancyGuard, Ownable {
    // NFT Structs
    struct Auction {
        string s_tokenURIs;
        uint256 s_tokenIdToBid;
        address s_tokenIdToBidder;
        uint256 s_tokenIdToAuctionStart;
    }

    // NFT Variables
    uint256 constant minBid = 0.01 ether;
    uint256 constant startPrice = 0.1 ether;
    uint256 constant auctionDuration = 30;

    // NFT Mappings
    mapping(uint256 => Auction) private auctions;

    // NFT Events
    event NFT_SetTokenURI(string uri, uint256 tokenId);
    event NFT_Minted(address minter, uint256 tokenId);
    event NFT_LastBidReturned(uint256 bid, bool transfer);
    event NFT_WithdrawCompleted(uint256 amount, bool transfer);
    event NFT_AuctionExtended(uint256 time, uint256 tokenId);
    event NFT_BidPlaced(uint256 amount, address bidder, uint256 tokenId);

    constructor() ERC721A("Abstract Impulse", "AIN") {}

    function mintNFT(string memory externalTokenURI) public onlyOwner {
        uint256 newTokenId = totalSupply();
        Auction storage auction = auctions[newTokenId];

        _mint(msg.sender, 1);
        auction.s_tokenURIs = externalTokenURI;
        // tokenURI(newTokenId);    // -> do we call it or not?
        auction.s_tokenIdToBid = startPrice;
        auction.s_tokenIdToAuctionStart = block.timestamp;

        emit NFT_Minted(msg.sender, newTokenId);
        emit NFT_SetTokenURI(auction.s_tokenURIs, newTokenId);
    }

    function placeBid(uint256 tokenId) public payable nonReentrant {
        Auction storage auction = auctions[tokenId];
        // Make sure the contract owner cannot bid
        if (msg.sender == owner()) revert Abstract__ContractOwnerIsNotAllowedToBid();

        // Check if NFT exists
        if (totalSupply() <= tokenId) revert Abstract__NotExistingTokenId();

        // Check if the auction is still ongoing
        if ((auction.s_tokenIdToAuctionStart + auctionDuration) < block.timestamp) {
            revert Abstract__AuctionFinishedForThisNFT();
        }

        // Extend the auction by 5 minutes if it's close to ending
        if ((auction.s_tokenIdToAuctionStart + auctionDuration - block.timestamp) < 2 minutes) {
            auction.s_tokenIdToAuctionStart += 2 minutes;
            emit NFT_AuctionExtended(auction.s_tokenIdToAuctionStart + auctionDuration - block.timestamp, tokenId);
        }

        // If there were no previous bids
        if (auction.s_tokenIdToBidder == address(0)) {
            // Check if the bid amount is high enough
            if (msg.value < startPrice) {
                revert Abstract__NotEnoughETH();
            }
        }
        // If there were previous bids
        else {
            // Check if the bid amount is high enough
            if (msg.value < (auction.s_tokenIdToBid + minBid)) revert Abstract__NotEnoughETH();

            // Transfer the previous highest bid to the previous bidder
            (bool success, ) = auction.s_tokenIdToBidder.call{value: auction.s_tokenIdToBid}("New Highest Bid Received!");
            if (!success) revert Abstract__TransferFailed();

            emit NFT_LastBidReturned(auction.s_tokenIdToBid, success);
        }

        // Update the bid and bidder
        auction.s_tokenIdToBidder = payable(msg.sender);
        auction.s_tokenIdToBid = msg.value;
        emit NFT_BidPlaced(auction.s_tokenIdToBid, auction.s_tokenIdToBidder, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        Auction storage auction = auctions[tokenId];
        return auction.s_tokenURIs;
    }

    function approve(address to, uint256 tokenId) public payable override biddingStateCheck(tokenId) {
        super.approve(to, tokenId);
    }

    function transferFrom(address from, address to, uint256 tokenId) public payable override biddingStateCheck(tokenId) {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public payable override biddingStateCheck(tokenId) {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public payable override biddingStateCheck(tokenId) {
        super.safeTransferFrom(from, to, tokenId, _data);
    }

    // Function disabled! It is pure so cannot be called anyway
    function setApprovalForAll(address /*operator*/, bool /*approved*/) public pure override {}

    /**
     * @dev This will occur once timer end or if owner decide to accept bid, so js script has to trigger it, but there is onlyOwner approval needed
     */
    function acceptBid(uint256 tokenId) public onlyOwner biddingStateCheck(tokenId) {
        Auction storage auction = auctions[tokenId];
        if (auction.s_tokenIdToBid == startPrice) revert Abstract__NoBidReceivedForThisNFT();

        withdrawMoney(tokenId);
        approve(auction.s_tokenIdToBidder, tokenId);
    }

    /**
     * @dev We are able to withdraw money from contract only for closed biddings
     */
    function withdrawMoney(uint256 tokenId) public onlyOwner biddingStateCheck(tokenId) {
        Auction storage auction = auctions[tokenId];
        if (totalSupply() <= tokenId) revert Abstract__NotExistingTokenId();

        (bool success, ) = msg.sender.call{value: auction.s_tokenIdToBid}("");
        if (!success) revert Abstract__TransferFailed();

        emit NFT_WithdrawCompleted(auction.s_tokenIdToBid, success);
    }

    function renewAuction(uint256 tokenId) public onlyOwner biddingStateCheck(tokenId) {
        Auction storage auction = auctions[tokenId];
        if (totalSupply() <= tokenId) revert Abstract__NotExistingTokenId();
        if (auction.s_tokenIdToBid > startPrice) revert Abstract__BidReceivedForThisNFT();

        auction.s_tokenIdToAuctionStart = block.timestamp - auctionDuration;

        emit NFT_AuctionExtended((auction.s_tokenIdToAuctionStart += auctionDuration), tokenId);
    }

    modifier biddingStateCheck(uint256 tokenId) {
        Auction storage auction = auctions[tokenId];
        if ((auction.s_tokenIdToAuctionStart + auctionDuration) > block.timestamp) {
            revert Abstract__AuctionStillOpenForThisNFT();
        }
        _;
    }

    // Function to be deleted
    function getLogic(uint256 tokenId) public view returns (bool) {
        Auction storage auction = auctions[tokenId];
        return auction.s_tokenIdToBidder == address(0);
    }

    function getHighestBidder(uint256 tokenId) public view returns (address) {
        Auction storage auction = auctions[tokenId];
        return auction.s_tokenIdToBidder;
    }

    function getHighestBid(uint256 tokenId) public view returns (uint256) {
        Auction storage auction = auctions[tokenId];
        return auction.s_tokenIdToBid;
    }

    /**
     * @dev Function To Be Deleted
     */
    function getBidderBalance(address bidderAddress) public view returns (uint256) {
        return bidderAddress.balance;
    }

    function getTime(uint256 tokenId) public view returns (uint256) {
        Auction storage auction = auctions[tokenId];
        if ((auction.s_tokenIdToAuctionStart + auctionDuration) < block.timestamp) {
            revert Abstract__AuctionFinishedForThisNFT();
        }

        return auction.s_tokenIdToAuctionStart + auctionDuration - block.timestamp;
    }
}
