const { ethers, getNamedAccounts, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

async function acceptBid() {
    const { deployer } = await getNamedAccounts()
    /** @dev Getting last deployed contract on picked network */
    const abstractImpulseNFT = await ethers.getContract("AbstractImpulseNFT", deployer)
    console.log(`Working On AbstractImpulseNFT Contract: ${abstractImpulseNFT.address} Owner: ${deployer}`)
}

if (!developmentChains.includes(network.name)) {
    acceptBid()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
} else {
    console.log("This script is allowed only for Goerli, Sepolia or Mainnet")
}
