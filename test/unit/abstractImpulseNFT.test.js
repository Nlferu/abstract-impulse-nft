// Tests in progress...
const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Abstract NFT Unit Tests", function () {
          let abstractImpulseNFT, deployer

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["AbstractImpulseNFT"])
              abstractImpulseNFT = await ethers.getContract("AbstractImpulseNFT")
          })

          describe("Constructor", () => {
              it("Initializes the NFT Correctly.", async () => {
                  const name = await abstractImpulseNFT.name()
                  const symbol = await abstractImpulseNFT.symbol()
                  const tokenCounter = await abstractImpulseNFT.getTokenCounter()

                  assert.equal(name, "Abstract Impulse")
                  assert.equal(symbol, "AIN")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })

          describe("Mint NFT", () => {
              beforeEach(async () => {
                  const txResponse = await abstractImpulseNFT.mintNFT("tokenURI", "nftTitle")
                  await txResponse.wait(1)
              })
              it("Allows owner to mint an NFT", async function () {
                  const tokenCounter = await abstractImpulseNFT.getTokenCounter()
                  const maliciousAccount = accounts[2]

                  /**
                   * @dev Below Test To Be Fixed!
                   
                     await expect(abstractImpulseNFT.mintNFT("tokenURI", "nftTitle", { from: maliciousAccount.address })).to.be.revertedWith(
                         "Ownable: caller is not the owner"
                     )

                  */
                  assert.equal(tokenCounter.toString(), "1")
              })
              it("Show the correct owner and balance of NFT's", async function () {
                  const deployerAddress = deployer.address
                  const deployerBalance = await abstractImpulseNFT.balanceOf(deployerAddress)
                  const owner = await abstractImpulseNFT.ownerOf("0")

                  // Second Mint
                  await abstractImpulseNFT.mintNFT("tokenURI2", "nftTitle2")
                  const secBalance = await abstractImpulseNFT.balanceOf(deployerAddress)
                  const secOwner = await abstractImpulseNFT.ownerOf("1")

                  assert.equal(deployerBalance.toString(), "1")
                  assert.equal(owner, deployerAddress)
                  assert.equal(secBalance.toString(), "2")
                  assert.equal(secOwner, deployerAddress)
                  await expect(abstractImpulseNFT.ownerOf("2")).to.be.revertedWith("ERC721: invalid token ID")
              })
          })
      })
