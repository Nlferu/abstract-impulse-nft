// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract AbstractImpulseNft is ERC721URIStorage, Ownable {
    // NFT Variables
    uint256 private s_tokenId;

    // NFT Events
    event NftMinted(address minter, string title);

    constructor() ERC721("Abstract Impulse", "AIN") {
        s_tokenId = 0;
    }

    // In order to create new NFT we can use below:
    function mintNFT(string memory tokenURI, string memory nftTitle) public onlyOwner returns (uint256) {
        uint256 newTokenId = s_tokenId;
        s_tokenId += 1;

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        emit NftMinted(msg.sender, nftTitle);
        return newTokenId;
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenId;
    }
}
