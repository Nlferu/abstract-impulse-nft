// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ChatNFT is ERC721URIStorage, Ownable {
    uint256 public auctionDuration; // duration of the auction in seconds

    struct Auction {
        address highestBidder;
        uint256 highestBid;
        uint256 endTime;
    }

    mapping(uint256 => Auction) public auctions; // mapping of NFT id to auction

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) {
        auctionDuration = 86400; // default auction duration is 1 day
    }

    function mint(address _to, uint256 _tokenId, string memory _tokenURI) public onlyOwner {
        _safeMint(_to, _tokenId);
        _setTokenURI(_tokenId, _tokenURI);
    }

    function startAuction(uint256 _tokenId) public onlyOwner {
        require(ownerOf(_tokenId) == msg.sender, "Only NFT owner can start an auction");

        Auction memory auction = auctions[_tokenId];
        require(auction.endTime == 0, "Auction already started");

        auction.endTime = block.timestamp + auctionDuration;
        auctions[_tokenId] = auction;
    }

    function placeBid(uint256 _tokenId) public payable {
        require(ownerOf(_tokenId) != address(0), "NFT does not exist");
        require(ownerOf(_tokenId) != msg.sender, "NFT owner cannot place a bid");

        Auction storage auction = auctions[_tokenId];
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(msg.value > auction.highestBid, "Bid must be higher than the current highest bid");

        if (auction.highestBid > 0) {
            // refund previous highest bidder
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
    }

    function claim(uint256 _tokenId) public {
        require(ownerOf(_tokenId) != address(0), "NFT does not exist");
        require(block.timestamp >= auctions[_tokenId].endTime, "Auction has not ended yet");
        require(msg.sender == auctions[_tokenId].highestBidder, "You are not the highest bidder");

        _transfer(ownerOf(_tokenId), msg.sender, _tokenId);

        Auction memory auction = auctions[_tokenId];
        payable(auction.highestBidder).transfer(auction.highestBid); // transfer the highest bid to the NFT owner
        delete auctions[_tokenId];
    }

    function setAuctionDuration(uint256 _auctionDuration) public onlyOwner {
        auctionDuration = _auctionDuration;
    }
}
