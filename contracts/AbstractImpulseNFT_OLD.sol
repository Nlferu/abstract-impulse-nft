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
contract AbstractImpulseNFTOLD is ERC721A, ReentrancyGuard, Ownable {
    // NFT Variables
    uint256 constant minBid = 0.01 ether;
    uint256 constant minEndPrice = 0.1 ether;
    uint256 constant auctionDuration = 30;

    // NFT Mappings
    mapping(uint256 => string) private s_tokenURIs;
    mapping(uint256 => uint256) private s_tokenIdToBid;
    mapping(uint256 => address payable) private s_tokenIdToBidder;
    mapping(uint256 => uint256) private s_tokenIdToAuctionStart;

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

        _mint(msg.sender, 1);
        s_tokenURIs[newTokenId] = externalTokenURI;
        // tokenURI(newTokenId);    // -> do we call it or not?
        s_tokenIdToAuctionStart[newTokenId] = block.timestamp;

        emit NFT_Minted(msg.sender, nftTitle);
        emit NFT_TokenURISet(s_tokenURIs[newTokenId]);
    }

    function placeBid(uint256 tokenId) public payable nonReentrant {
        // Make sure the contract owner cannot bid
        if (msg.sender == owner()) {
            revert Abstract__ContractOwnerIsNotAllowedToBid();
        }

        // Make sure the token exists
        if (totalSupply() < tokenId) {
            revert Abstract__NotExistingTokenId();
        }

        // Check if the auction is still ongoing
        if ((s_tokenIdToAuctionStart[tokenId] + auctionDuration) < block.timestamp) {
            revert Abstract__AuctionFinishedForThisNFT();
        }

        // Extend the auction by 5 minutes if it's close to ending
        if ((s_tokenIdToAuctionStart[tokenId] + auctionDuration - block.timestamp) < 2 minutes) {
            s_tokenIdToAuctionStart[tokenId] += 2 minutes;
            emit NFT_AuctionExtended(s_tokenIdToAuctionStart[tokenId]);
        }

        // If there were no previous bids
        if (s_tokenIdToBidder[tokenId] == address(0)) {
            // Check if the bid amount is high enough
            if (msg.value <= minBid) {
                revert Abstract__NotEnoughETH();
            }
        }
        // If there were previous bids
        else {
            // Check if the bid amount is high enough
            if (msg.value <= (s_tokenIdToBid[tokenId] + minBid)) {
                revert Abstract__NotEnoughETH();
            }

            // Transfer the previous highest bid to the previous bidder
            (bool success, ) = s_tokenIdToBidder[tokenId].call{value: s_tokenIdToBid[tokenId]}("New Highest Bid Received!");

            if (!success) {
                revert Abstract__TransferFailed();
            }
            emit NFT_LastBidReturned(s_tokenIdToBid[tokenId], success);
        }

        // Update the bid and bidder
        s_tokenIdToBidder[tokenId] = payable(msg.sender);
        s_tokenIdToBid[tokenId] = msg.value;
        emit NFT_BidPlaced(msg.value);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return s_tokenURIs[tokenId];
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

    // Function setApprovalForAll() function takes new "approved address" and second argument if true: it will give approval for all tokenId's to that address
    // if we then call false as owner approval will be revoken to all tokenId's for that address

    /**
     * @dev This will occur once timer end or if owner decide to accept bid, so js script has to trigger it, but there is onlyOwner approval needed
     * Or we can just simply post info on website when certain auction will finish and end it manually
     * If Bidding state is clsoed -> error
     */
    function acceptBid(uint256 tokenId) public onlyOwner biddingStateCheck(tokenId) {
        if (s_tokenIdToBid[tokenId] == 0) {
            revert Abstract__NoBidDetectedForThisToken();
        }

        (bool success, ) = msg.sender.call{value: s_tokenIdToBid[tokenId]}("");

        if (!success) {
            revert Abstract__TransferFailed();
        }

        approve(s_tokenIdToBidder[tokenId], tokenId);

        emit NFT_UserApproved(s_tokenIdToBidder[tokenId], tokenId);
        emit NFT_WithdrawCompleted(s_tokenIdToBid[tokenId], success);
    }

    /**
     * @dev We will be able to withdraw money from contract only for closed biddings
     */
    // function withdraw(uint256 tokenId) public onlyOwner biddingStateCheck(tokenId) {
    //     (bool success, ) = msg.sender.call{value: s_tokenIdToBid[tokenId]}("");

    //     if (!success) {
    //         revert Abstract__TransferFailed();
    //     }
    //     // Add emit
    // }

    modifier biddingStateCheck(uint256 tokenId) {
        if ((s_tokenIdToAuctionStart[tokenId] + auctionDuration) > block.timestamp) {
            revert Abstract__AuctionStillOpenForThisNFT();
        }
        _;
    }

    // function getBiddingState(uint256 tokenId) public view returns (BiddingState) {
    //     return s_tokenIdToBiddingState[tokenId];
    // }

    // Function to be deleted
    function getLogic(uint256 tokenId) public view returns (bool) {
        return s_tokenIdToBidder[tokenId] == address(0);
    }

    function getHighestBidder(uint256 tokenId) public view returns (address) {
        return s_tokenIdToBidder[tokenId];
    }

    function getHighestBid(uint256 tokenId) public view returns (uint256) {
        return s_tokenIdToBid[tokenId];
    }

    function getBidderBalance(address bidderId) public view returns (uint256) {
        return bidderId.balance;
    }

    function getTime(uint256 tokenId) public view returns (uint256) {
        return s_tokenIdToAuctionStart[tokenId] + auctionDuration - block.timestamp;
    }
}
