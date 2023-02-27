// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract AbstractImpulseNft is ERC721URIStorage, Ownable {
    // NFT Variables
    using Counters for Counters.Counter;
    Counters.Counter private s_tokenId;

    // NFT Events
    event NftMinted(address minter, string title);

    constructor() ERC721("Abstract Impulse", "AIN") {
        // This might be not necessary if using Counters library
        //s_tokenId = 0;
    }

    // In order to create new NFT we can use below:
    function mintNFT(string memory tokenURI, string memory nftTitle) public onlyOwner returns (uint256) {
        uint256 newTokenId = s_tokenId.current();
        // This is to be tested compared to "s_tokenId += 1"
        s_tokenId.increment();

        _mint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        emit NftMinted(msg.sender, nftTitle);
        return newTokenId;
    }

    /*
        ERC721 has both safeTransferFrom and transferFrom, where safeTransferFrom throws if the receiving contract's onERC721Received method 
        doesn't return a specific magic number. This is to ensure a receiving contract is capable of receiving the token, so it isn't permanently lost.
    */

    // We can use "safeTransferFrom()" function to transfer ownership of NFT Token Between Wallets

    function getTokenCounter() public view returns (Counters.Counter memory) {
        return s_tokenId;
    }
}
