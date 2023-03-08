// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CheapNFT is ERC721, Ownable {
    uint256 public auctionDuration;

    struct Auction {
        address highestBidder;
        uint256 highestBid;
        uint256 endTime;
    }

    mapping(uint256 => Auction) public auctions;

    constructor() ERC721("MyNFT", "MNFT") {
        auctionDuration = 86400;
    }

    function mint(address _to, uint256 _tokenId) public onlyOwner {
        _safeMint(_to, _tokenId);
    }

    function startAuction(uint256 _tokenId) public onlyOwner {
        require(ownerOf(_tokenId) == msg.sender, "Only NFT owner can start an auction");

        Auction storage auction = auctions[_tokenId];
        require(auction.endTime == 0, "Auction already started");

        auction.endTime = block.timestamp + auctionDuration;
    }

    function placeBid(uint256 _tokenId) public payable {
        require(ownerOf(_tokenId) != address(0), "NFT does not exist");
        require(ownerOf(_tokenId) != msg.sender, "NFT owner cannot place a bid");

        Auction storage auction = auctions[_tokenId];
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(msg.value > auction.highestBid, "Bid must be higher than the current highest bid");

        if (auction.highestBid > 0) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBidder = msg.sender;
        auction.highestBid = msg.value;
    }

    function claim(uint256 _tokenId) public {
        require(ownerOf(_tokenId) != address(0), "NFT does not exist");
        require(block.timestamp >= auctions[_tokenId].endTime, "Auction has not ended yet");
        require(msg.sender == auctions[_tokenId].highestBidder, "You are not the highest bidder");

        address nftOwner = ownerOf(_tokenId);
        _transfer(nftOwner, msg.sender, _tokenId);

        Auction memory auction = auctions[_tokenId];
        payable(nftOwner).transfer(auction.highestBid);
        delete auctions[_tokenId];
    }

    function setAuctionDuration(uint256 _auctionDuration) public onlyOwner {
        auctionDuration = _auctionDuration;
    }
}
