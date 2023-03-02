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

                  assert.equal(tokenCounter.toString(), "1")
              })
              it("Not allows accounts other than owner minting NFT", async function () {
                  const maliciousAccount = accounts[2]
                  // In order to use above account we have to first connect it to our mother contract instance
                  const abstractExternal = await abstractImpulseNFT.connect(maliciousAccount)

                  await expect(abstractExternal.mintNFT("tokenURI", "nftTitle")).to.be.revertedWith("Ownable: caller is not the owner")
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
          describe("Place Bid", () => {
              beforeEach(async () => {
                  const txResponse = await abstractImpulseNFT.mintNFT("tokenURI", "nftTitle")
                  await txResponse.wait(1)
                  const owner = await abstractImpulseNFT.owner()
                  console.log(`Contract Owner: ${owner}`)
              })
              it("Allows user to bid an NFT", async function () {
                  const user = accounts[3]
                  console.log(`External User ${user.address}`)
                  const abstractExternal = await abstractImpulseNFT.connect(user)
                  tx = await abstractExternal.placeBid(0, { value: ethers.utils.parseEther("1") })
                  //await expect(abstractExternal.placeBid(0)).not.to.be.reverted
                  assert(tx)
              })
              it("Not allows owner to bid an NFT", async function () {
                  await expect(abstractImpulseNFT.placeBid(0)).to.be.revertedWith("Abstract__ContractOwnerIsNotAllowedToBid")
              })
          })
      })
