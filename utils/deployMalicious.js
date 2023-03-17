const { hre } = require("hardhat")

// Script to be fixed
async function deployMaliciousContract(user, abstractImpulseNFTAddress) {
    const MaliciousContract = await hre.ethers.getContractFactory("MaliciousContract")
    arguments = [abstractImpulseNFTAddress]
    const maliciousContract = await MaliciousContract.deploy("MaliciousContract", {
        from: user,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    return maliciousContract
}

module.exports = { deployMaliciousContract }
