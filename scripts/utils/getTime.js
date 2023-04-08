const { ethers, getNamedAccounts, network } = require("hardhat")
const { developmentChains, motherContract } = require("../../helper-hardhat-config")
const prompt = require("prompt-sync")()

let tokenId = prompt("TokenId: ")

async function getTime() {
    const abstractImpulseNFT = await ethers.getContractAt("AbstractImpulseNFT", motherContract)

    console.log(`Working With AbstractImpulseNFT Contract: ${abstractImpulseNFT.address} As: ${await abstractImpulseNFT.owner()}`)

    const time = await abstractImpulseNFT.getTime(tokenId)

    console.log(`NFT With TokenId: ${tokenId} Auction Time Left: ${time}`)

    return time
}

if (!developmentChains.includes(network.name)) {
    getTime()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
} else {
    console.log("This script is allowed only for Goerli, Sepolia or Mainnet")
}
