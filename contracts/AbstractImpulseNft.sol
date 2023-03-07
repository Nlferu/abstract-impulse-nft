// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

error Abstract__NotEnoughETH();
error Abstract__TransferFailed();
error Abstract__NotExistingTokenId();
error Abstract__BiddingClosedForThisNFT();
error Abstract__ContractOwnerIsNotAllowedToBid();
error Abstract__BiddingNotFinishedYetForThisNFT();

/**
*@dev
    Add "ReentrancyGuard" to protect
*/
contract AbstractImpulseNFT is ERC721URIStorage, Ownable {
    // Type Declaration
    enum BiddingState {
        OPEN,
        CLOSED
    }

    // NFT Variables
    using Counters for Counters.Counter;
    Counters.Counter private s_tokenId;

    // NFT Mappings
    mapping(uint256 => address payable) private s_tokenIdToBidder;
    mapping(uint256 => uint256) private s_tokenIdToBids;
    mapping(uint256 => BiddingState) private s_tokenIdToBiddingState;

    // NFT Events
    event NFTMinted(address minter, string title);
    event FirstNFTBidPlaced(uint256 amount);
    event NFTBidPlaced(uint256 amount);

    constructor() ERC721("Abstract Impulse", "AIN") {}

    // In order to create new NFT we can use below:
    // mint() or _safeMint() to be considered
    function mintNFT(string memory tokenURI, string memory nftTitle) public onlyOwner returns (uint256) {
        uint256 newTokenId = s_tokenId.current();
        // This is to be tested compared to "s_tokenId += 1"
        s_tokenId.increment();
        // Changing State For New NFT is not necessary as it is set to OPEN as default...
        // s_tokenIdToBiddingState[newTokenId] = BiddingState.OPEN;

        _mint(msg.sender, newTokenId);
        // Below is just assigning "tokenId" to correct "tokenURI"
        _setTokenURI(newTokenId, tokenURI);

        emit NFTMinted(msg.sender, nftTitle);
        return newTokenId;
    }

    function placeBid(uint256 tokenId) public payable {
        if (msg.sender == owner()) {
            revert Abstract__ContractOwnerIsNotAllowedToBid();
        }
        if (s_tokenId.current() > tokenId) {
            if (s_tokenIdToBidder[tokenId] == address(0)) {
                /**
                 * @dev Check, which conditions method is better/cheaper.
                 */
                // ------------------------------------------------------- Method 1 --------------------------------------------------------
                if (msg.value <= 0) {
                    revert Abstract__NotEnoughETH();
                }
                // ------------------------------------------------------- Method 2 --------------------------------------------------------
                //require(msg.value > 0, "Didn't send enough ETH!");

                // State Checking...
                if (s_tokenIdToBiddingState[tokenId] == BiddingState.CLOSED) {
                    revert Abstract__BiddingClosedForThisNFT();
                }

                s_tokenIdToBidder[tokenId] = payable(msg.sender);
                s_tokenIdToBids[tokenId] = msg.value;
                console.log("First Bid Value Of:", msg.value, "For 0 NFT Received!");
                emit FirstNFTBidPlaced(msg.value);
            } else {
                /**
                 * @dev Implement better solution from above once tested!
                 */
                require(msg.value > s_tokenIdToBids[tokenId], "Didn't send enough ETH!");

                // State Checking...
                if (s_tokenIdToBiddingState[tokenId] == BiddingState.CLOSED) {
                    revert Abstract__BiddingClosedForThisNFT();
                }

                /**
                 * @dev Check, which transfer method is better/cheaper.
                 */
                // ------------------------------------------------------- Method 1 --------------------------------------------------------
                // (bool success, ) = s_tokenIdToBidder[tokenId].call{value: s_tokenIdToBids[tokenId]}("New Highest Bid Received!");
                // console.log("New Highest Bid Of:", msg.value, "Received!");
                // // require(success, "Transfer failed");
                // if (!success) {
                //     revert Abstract__TransferFailed();
                // }
                // ------------------------------------------------------- Method 2 --------------------------------------------------------
                s_tokenIdToBidder[tokenId].transfer(s_tokenIdToBids[tokenId]);

                console.log("Previous Bid Of:", s_tokenIdToBids[tokenId], "Returned To It's Owner!");
                s_tokenIdToBidder[tokenId] = payable(msg.sender);
                s_tokenIdToBids[tokenId] = msg.value;
                emit NFTBidPlaced(msg.value);
            }
        } else {
            revert Abstract__NotExistingTokenId();
        }
    }

    // Function for owner to end bidding and transfer NFT immediately
    function acceptBid() public onlyOwner {}

    /**
     * @dev This will occur once timer end, so js script has to trigger it, but there is onlyOwner approval needed
     */
    function tokenBiddingEnder(uint256 tokenId) public onlyOwner {
        if (s_tokenIdToBiddingState[tokenId] == BiddingState.CLOSED) {
            revert Abstract__BiddingClosedForThisNFT();
        }
        s_tokenIdToBiddingState[tokenId] = BiddingState.CLOSED;
        console.log("Auction Finished! For", tokenId);
        console.log("Transferring Token To New Owner...");
        tokenTransfer(tokenId);
        console.log("Paying Artist...");
        withdraw(tokenId);
    }

    /**
     * @dev This will transfer NFT after it's bidding ends
     */
    function tokenTransfer(uint256 tokenId) public onlyOwner {
        if (s_tokenIdToBiddingState[tokenId] == BiddingState.OPEN) {
            revert Abstract__BiddingNotFinishedYetForThisNFT();
        }
        safeTransferFrom(msg.sender, getBidder(tokenId), tokenId);
    }

    /**
     * @dev We will be able to withdraw money from contract only for closed biddings
     */
    function withdraw(uint256 tokenId) public onlyOwner {
        if (s_tokenIdToBiddingState[tokenId] == BiddingState.OPEN) {
            revert Abstract__BiddingNotFinishedYetForThisNFT();
        }
        payable(msg.sender).transfer(s_tokenIdToBids[tokenId]);
    }

    /*
        ERC721 has both safeTransferFrom and transferFrom, where safeTransferFrom throws if the receiving contract's onERC721Received method 
        doesn't return a specific magic number. This is to ensure a receiving contract is capable of receiving the token, so it isn't permanently lost.
    */

    // We can use "safeTransferFrom()" function to transfer ownership of NFT Token Between Wallets

    function getTokenCounter() public view returns (Counters.Counter memory) {
        return s_tokenId;
    }

    function getTokenIdToTokenURI(uint256 tokenId) public view returns (string memory) {
        return this.tokenURI(tokenId);
    }

    function getBiddingState(uint256 tokenId) public view returns (BiddingState) {
        return s_tokenIdToBiddingState[tokenId];
    }

    function getLogic(uint256 tokenId) public view returns (bool) {
        return s_tokenIdToBidder[tokenId] == address(0);
    }

    function getBidder(uint256 tokenId) public view returns (address) {
        return s_tokenIdToBidder[tokenId];
    }

    function getBidd(uint256 tokenId) public view returns (uint256) {
        return s_tokenIdToBids[tokenId];
    }

    function getBidderBalance(address bidderId) public view returns (uint256) {
        return bidderId.balance;
    }
}
