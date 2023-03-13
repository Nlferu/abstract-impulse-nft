// SPDX-License-Identifier: MIT
pragma solidity 0.8.8; // Change to 0.8.17

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error Abstract__NotEnoughETH();
error Abstract__TransferFailed();
error Abstract__NotExistingTokenId();
error Abstract__NoBidDetectedForThisToken();
error Abstract__AuctionFinishedForThisNFT();
error Abstract__AuctionStillOpenForThisNFT();
error Abstract__ContractOwnerIsNotAllowedToBid();

/**
 *@dev
 * Functions with transfer back ETH should be nonReentrant
 */
contract AbstractImpulseNFT is ERC721A, ReentrancyGuard, Ownable {
    // NFT Structs
    struct Auction {
        string s_tokenURIs;
        address s_tokenIdToBidder;
        uint256 s_tokenIdToBid;
        uint256 s_tokenIdToAuctionStart;
    }

    // NFT Variables
    uint256 constant minBid = 0.01 ether;
    uint256 constant minEndPrice = 0.1 ether;
    uint256 constant auctionDuration = 30;

    // NFT Mappings
    mapping(uint256 => Auction) private auctions;

    // NFT Events
    event NFT_BidPlaced(uint256 amount);
    event NFT_Minted(address minter, string title);
    event NFT_AuctionExtended(uint256 time);
    event NFT_LastBidReturned(uint256 bid, bool transfer);
    event NFT_TokenURISet(string uri);
    event NFT_WithdrawCompleted(uint256 bid, bool transfer);
    event NFT_UserApproved(address user, uint256 tokenId);

    constructor() ERC721A("Abstract Impulse", "AIN") {}

    function mintNFT(string memory externalTokenURI, string memory nftTitle) public onlyOwner {
        uint256 newTokenId = totalSupply();
        Auction storage auction = auctions[newTokenId];

        _mint(msg.sender, 1);
        auction.s_tokenURIs = externalTokenURI;
        // tokenURI(newTokenId);    // -> do we call it or not?
        auction.s_tokenIdToAuctionStart = block.timestamp;

        emit NFT_Minted(msg.sender, nftTitle);
        emit NFT_TokenURISet(auction.s_tokenURIs);
    }

    function placeBid(uint256 tokenId) public payable nonReentrant {
        Auction storage auction = auctions[tokenId];
        // Make sure the contract owner cannot bid
        if (msg.sender == owner()) {
            revert Abstract__ContractOwnerIsNotAllowedToBid();
        }

        // Make sure the token exists
        if (totalSupply() < tokenId) {
            revert Abstract__NotExistingTokenId();
        }

        // Check if the auction is still ongoing
        if ((auction.s_tokenIdToAuctionStart + auctionDuration) < block.timestamp) {
            revert Abstract__AuctionFinishedForThisNFT();
        }

        // Extend the auction by 5 minutes if it's close to ending
        if ((auction.s_tokenIdToAuctionStart + auctionDuration - block.timestamp) < 2 minutes) {
            auction.s_tokenIdToAuctionStart += 2 minutes;
            emit NFT_AuctionExtended(auction.s_tokenIdToAuctionStart);
        }

        // If there were no previous bids
        if (auction.s_tokenIdToBidder == address(0)) {
            // Check if the bid amount is high enough
            if (msg.value <= minBid) {
                revert Abstract__NotEnoughETH();
            }
        }
        // If there were previous bids
        else {
            // Check if the bid amount is high enough
            if (msg.value <= (auction.s_tokenIdToBid + minBid)) {
                revert Abstract__NotEnoughETH();
            }

            // Transfer the previous highest bid to the previous bidder
            (bool success, ) = auction.s_tokenIdToBidder.call{value: auction.s_tokenIdToBid}("New Highest Bid Received!");

            if (!success) {
                revert Abstract__TransferFailed();
            }
            emit NFT_LastBidReturned(auction.s_tokenIdToBid, success);
        }

        // Update the bid and bidder
        auction.s_tokenIdToBidder = payable(msg.sender);
        auction.s_tokenIdToBid = msg.value;
        emit NFT_BidPlaced(msg.value);
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

    // It is pure so cannot be called anyway
    function setApprovalForAll(address /*operator*/, bool /*approved*/) public pure override {}

    // Function setApprovalForAll() function takes new "approved address" and second argument if true: it will give approval for all tokenId's to that address
    // if we then call false as owner approval will be revoken to all tokenId's for that address

    /**
     * @dev This will occur once timer end or if owner decide to accept bid, so js script has to trigger it, but there is onlyOwner approval needed
     * Or we can just simply post info on website when certain auction will finish and end it manually
     * If Bidding state is clsoed -> error
     */
    function acceptBid(uint256 tokenId) public onlyOwner biddingStateCheck(tokenId) {
        Auction storage auction = auctions[tokenId];
        if (auction.s_tokenIdToBid == 0) {
            revert Abstract__NoBidDetectedForThisToken();
        }

        withdraw(tokenId);
        approve(auction.s_tokenIdToBidder, tokenId);

        emit NFT_UserApproved(auction.s_tokenIdToBidder, tokenId);
    }

    /**
     * @dev We will be able to withdraw money from contract only for closed biddings
     */
    function withdraw(uint256 tokenId) public onlyOwner biddingStateCheck(tokenId) {
        Auction storage auction = auctions[tokenId];

        (bool success, ) = msg.sender.call{value: auction.s_tokenIdToBid}("");
        if (!success) {
            revert Abstract__TransferFailed();
        }

        emit NFT_WithdrawCompleted(auction.s_tokenIdToBid, success);
    }

    /**
     * @dev Function To Be Coded:
     * TODO reinstate auction pozwala wystawic nft ktory juz wygasl ponownie
     */

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

    function getBidderBalance(address bidderId) public view returns (uint256) {
        return bidderId.balance;
    }

    // Function to be deleted
    function getTime(uint256 tokenId) public view returns (uint256) {
        Auction storage auction = auctions[tokenId];
        return auction.s_tokenIdToAuctionStart + auctionDuration - block.timestamp;
    }
}
