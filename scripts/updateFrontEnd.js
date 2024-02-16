const fs = require("fs")
const { ethers } = require("hardhat")
const { developmentChains, frontEndContractsFile, frontEndAbiLocation } = require("../helper-hardhat-config")

async function updateFrontEnd() {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...")
        await updateContractAddresses()
        await updateAbi()
    }
}

async function updateAbi() {
    const abstractImpulseNft = await ethers.getContract("AbstractImpulseNFT")
    fs.writeFileSync(`${frontEndAbiLocation}AbstractImpulseNFT.json`, abstractImpulseNft.interface.format(ethers.utils.FormatTypes.json))
}

async function updateContractAddresses() {
    const chainId = network.config.chainId.toString()
    const abstractImpulseNft = await ethers.getContract("AbstractImpulseNFT")
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))

    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["AbstractImpulseNFT"].includes(abstractImpulseNft.address)) {
            contractAddresses[chainId]["AbstractImpulseNFT"].push(abstractImpulseNft.address)
        }
    } else {
        contractAddresses[chainId] = { AbstractImpulseNFT: [abstractImpulseNft.address] }
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

if (!developmentChains.includes(network.name)) {
    updateFrontEnd()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
} else {
    console.log("This script is allowed only for Goerli, Sepolia or Mainnet")
}
