const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const prompt = require("prompt-sync")()

let tokenId = prompt("TokenId: ")

async function renewAuction() {
    const abstractImpulseNFT = await ethers.getContract("AbstractImpulseNFT")

    console.log(`Working With AbstractImpulseNFT Contract: ${abstractImpulseNFT.address} Owner: ${await abstractImpulseNFT.owner()}`)

    const responseTx = await abstractImpulseNFT.renewAuction(tokenId)
    const receiptTx = await responseTx.wait()
    const time = receiptTx.events[0].args.time
    const token = receiptTx.events[0].args.tokenId

    console.log(`NFT Auction Time Renewed!`)
    console.log(`NFT With TokenId: ${token} Auction Time Left: ${time}`)
}

if (!developmentChains.includes(network.name)) {
    renewAuction()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
} else {
    console.log("This script is allowed only for Goerli, Sepolia or Mainnet")
}
