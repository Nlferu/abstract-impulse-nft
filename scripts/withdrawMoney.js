const { ethers, network } = require("hardhat")
const { developmentChains, motherContract } = require("../helper-hardhat-config")
const prompt = require("prompt-sync")()

let tokenId = prompt("TokenId: ")

async function withdrawMoney() {
    const abstractImpulseNFT = await ethers.getContractAt("AbstractImpulseNFT", motherContract)

    console.log(`Working With AbstractImpulseNFT Contract: ${abstractImpulseNFT.address} Owner: ${await abstractImpulseNFT.owner()}`)

    const responseTx = await abstractImpulseNFT.withdrawMoney(tokenId)
    const receiptTx = await responseTx.wait()
    const bid = receiptTx.events[0].args.amount
    const transfer = receiptTx.events[0].args.transfer

    console.log(`Money Withdrawal For TokenId: ${tokenId} Success!`)
    console.log(`Amount Received: ${bid} Transfer Status: ${transfer}`)
}

if (!developmentChains.includes(network.name)) {
    withdrawMoney()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
} else {
    console.log("This script is allowed only for Goerli, Sepolia or Mainnet")
}
