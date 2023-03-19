const { network, ethers } = require("hardhat")

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { user } = await getNamedAccounts()

    await deployments.fixture(["AbstractImpulseNFT"])
    const abstractImpulseNFT = await ethers.getContract("AbstractImpulseNFT")
    const abstractImpulseNFTAddress = abstractImpulseNFT.address

    log("----------------------------------------------------")
    arguments = [abstractImpulseNFTAddress]
    await deploy("MaliciousContract", {
        from: user,
        args: arguments,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })
}

module.exports.tags = ["all", "MaliciousContract"]
