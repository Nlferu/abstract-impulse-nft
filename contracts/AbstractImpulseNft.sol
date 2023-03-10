// SPDX-License-Identifier: MIT
pragma solidity 0.8.8;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Abstract__NotEnoughETH();
error Abstract__TransferFailed();
error Abstract__TotalSupplyReached();
error Abstract__NotExistingTokenId();
error Abstract__BiddingClosedForThisNFT();
error Abstract__ContractOwnerIsNotAllowedToBid();
error Abstract__BiddingNotFinishedYetForThisNFT();

/**
 *@dev
 * Add "ReentrancyGuard" to protect.
 * Functions with transfer back ETH should be nonReentrant
 * Check SOLMATE !!!
 */
contract AbstractImpulseNFT is ERC721A, Ownable {
    // Type Declaration
    enum BiddingState {
        OPEN,
        CLOSED
    }

    // NFT Variables
    // Below is not necessary
    uint256 private immutable MAX_SUPPLY = 300;

    // NFT Mappings
    mapping(uint256 => string) private s_tokenURIs;
    mapping(uint256 => uint256) private s_tokenIdToBids;
    mapping(uint256 => address payable) private s_tokenIdToBidder;
    mapping(uint256 => BiddingState) private s_tokenIdToBiddingState;

    // NFT Events
    event NFTMinted(address minter, string title);
    event FirstNFTBidPlaced(uint256 amount);
    event NFTBidPlaced(uint256 amount);

    constructor() ERC721A("Abstract Impulse", "AIN") {}

    function mintNFT(string memory externalTokenURI, string memory nftTitle) public onlyOwner {
        if ((totalSupply() + 1) >= MAX_SUPPLY) {
            revert Abstract__TotalSupplyReached();
        }
        uint256 newTokenId = totalSupply();
        // Changing State For New NFT is not necessary as it is set to OPEN as default...
        // s_tokenIdToBiddingState[newTokenId] = BiddingState.OPEN;

        _mint(msg.sender, 1);
        s_tokenURIs[newTokenId] = externalTokenURI;

        emit NFTMinted(msg.sender, nftTitle);
    }

    function placeBid(uint256 tokenId) public payable {
        if (msg.sender == owner()) {
            revert Abstract__ContractOwnerIsNotAllowedToBid();
        }
        if (totalSupply() > tokenId) {
            if (s_tokenIdToBidder[tokenId] == address(0)) {
                if (msg.value == 0) {
                    revert Abstract__NotEnoughETH();
                }

                // State Checking...
                if (s_tokenIdToBiddingState[tokenId] == BiddingState.CLOSED) {
                    revert Abstract__BiddingClosedForThisNFT();
                }

                s_tokenIdToBidder[tokenId] = payable(msg.sender);
                s_tokenIdToBids[tokenId] = msg.value;
                emit FirstNFTBidPlaced(msg.value);
            } else {
                if (msg.value <= s_tokenIdToBids[tokenId]) {
                    revert Abstract__NotEnoughETH();
                }

                // State Checking...
                if (s_tokenIdToBiddingState[tokenId] == BiddingState.CLOSED) {
                    revert Abstract__BiddingClosedForThisNFT();
                }

                (bool success, ) = s_tokenIdToBidder[tokenId].call{value: s_tokenIdToBids[tokenId]}("New Highest Bid Received!");

                if (!success) {
                    revert Abstract__TransferFailed();
                }

                s_tokenIdToBidder[tokenId] = payable(msg.sender);
                s_tokenIdToBids[tokenId] = msg.value;
                emit NFTBidPlaced(msg.value);
            }
        } else {
            revert Abstract__NotExistingTokenId();
        }
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return s_tokenURIs[tokenId];
    }

    // Function for owner to end bidding and transfer NFT immediately
    function acceptBid(uint256 tokenId) public onlyOwner {
        if (s_tokenIdToBiddingState[tokenId] == BiddingState.OPEN) {
            s_tokenIdToBiddingState[tokenId] == BiddingState.CLOSED;
            tokenTransfer(tokenId);
            withdraw(tokenId);
        } else {
            revert Abstract__BiddingClosedForThisNFT();
        }
    }

    /**
     * @dev This will occur once timer end, so js script has to trigger it, but there is onlyOwner approval needed
     * Or we can just simply post info on website when certain auction will finish and end it manually
     */
    function tokenBiddingEnder(uint256 tokenId) public onlyOwner {
        if (s_tokenIdToBiddingState[tokenId] == BiddingState.CLOSED) {
            revert Abstract__BiddingClosedForThisNFT();
        }
        s_tokenIdToBiddingState[tokenId] = BiddingState.CLOSED;
        tokenTransfer(tokenId);
        withdraw(tokenId);
    }

    /**
     * @dev This will transfer NFT after it's bidding ends
     * Function to be changed to allow auction winner to transfer token for himself with approve()
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

        (bool success, ) = msg.sender.call{value: s_tokenIdToBids[tokenId]}("");

        if (!success) {
            revert Abstract__TransferFailed();
        }
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

    function getBid(uint256 tokenId) public view returns (uint256) {
        return s_tokenIdToBids[tokenId];
    }

    function getBidderBalance(address bidderId) public view returns (uint256) {
        return bidderId.balance;
    }
}
