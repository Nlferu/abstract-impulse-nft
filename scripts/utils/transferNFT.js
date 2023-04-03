const { ethers, getNamedAccounts, network } = require("hardhat")
const { developmentChains, motherContract } = require("../../helper-hardhat-config")
const prompt = require("prompt-sync")()

let tokenId = prompt("TokenId: ")

async function transferNFT() {
    const { deployer } = await getNamedAccounts()

    /** @dev Getting last deployed contract on picked network */
    const abstractImpulseNFT = await ethers.getContractAt("AbstractImpulseNFT", motherContract, deployer)

    console.log(`Working On AbstractImpulseNFT Contract: ${abstractImpulseNFT.address} As: ${deployer}`)

    const responseTx = await abstractImpulseNFT["safeTransferFrom(address,address,uint256)"](
        "0x50e2a33B9E04e78bF1F1d1F94b0be95Be63C23e7",
        "0xe0c5aDdCfbd028FF4e69CDd6565efA5EedCFd743",
        tokenId
    )
    await responseTx.wait()

    console.log(`NFT With TokenId: ${tokenId} Has New Owner!`)
}

if (!developmentChains.includes(network.name)) {
    transferNFT()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
} else {
    console.log("This script is allowed only for Goerli, Sepolia or Mainnet")
}
