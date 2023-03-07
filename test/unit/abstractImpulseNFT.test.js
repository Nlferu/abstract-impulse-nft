// Tests in progress...
const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Abstract NFT Unit Tests", function () {
          let abstractImpulseNFT, abstractInstanceExternal, deployer, user

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["AbstractImpulseNFT"])
              abstractImpulseNFT = await ethers.getContract("AbstractImpulseNFT")
          })

          describe("Constructor", () => {
              it("Initializes the NFT Correctly.", async () => {
                  const owner = await abstractImpulseNFT.owner()
                  const name = await abstractImpulseNFT.name()
                  const symbol = await abstractImpulseNFT.symbol()
                  const tokenCounter = await abstractImpulseNFT.getTokenCounter()

                  assert.equal(owner, deployer.address)
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
                  const txResponse = await abstractImpulseNFT.mintNFT("tokenURI", "nftTitle")

                  assert(txResponse)
                  assert.equal(tokenCounter.toString(), "1")
              })
              it("Emits event when NFT is minted", async function () {
                  const txResponse = await abstractImpulseNFT.mintNFT("Token_URI", "NFT_Title")
                  const txReceipt = await txResponse.wait()
                  // We have to use 1 index as "_mint" function has index 0
                  const minter = txReceipt.events[1].args.minter
                  const title = txReceipt.events[1].args.title
                  console.log(`Minter: ${minter} Title: ${title}`)

                  assert.equal(minter == deployer.address, title == "NFT_Title")
                  await expect(abstractImpulseNFT.mintNFT("Token_URI", "NFT_Title")).to.emit(abstractImpulseNFT, `NFTMinted`)
              })
              it("Not allows accounts other than owner to mint an NFT", async function () {
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
              it("Assigns correct tokenId to tokenURI", async function () {
                  const assignedURI = await abstractImpulseNFT.getTokenIdToTokenURI(0)
                  await abstractImpulseNFT.mintNFT("Token_URI", "NFT_Title")
                  const secondAssignedURI = await abstractImpulseNFT.getTokenIdToTokenURI(1)

                  assert.equal(assignedURI, "tokenURI")
                  assert.equal(secondAssignedURI, "Token_URI")
              })
          })
          describe("Place Bid", () => {
              beforeEach(async () => {
                  const txResponse = await abstractImpulseNFT.mintNFT("tokenURI", "nftTitle")
                  await txResponse.wait(1)
                  // External User Of Our Contract
                  user = accounts[2]
                  abstractInstanceExternal = await abstractImpulseNFT.connect(user)
                  //const owner = await abstractImpulseNFT.owner()
              })
              it("Not allows owner to bid an NFT", async function () {
                  await expect(abstractImpulseNFT.placeBid(0, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith(
                      "Abstract__ContractOwnerIsNotAllowedToBid"
                  )
              })
              it("Revert if passed tokenId does not exist", async () => {
                  await expect(abstractInstanceExternal.placeBid(1, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith(
                      "Abstract__NotExistingTokenId"
                  )
              })
              it("For first NFT revert if placed bid value is 0 or less", async () => {
                  await expect(abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0") })).to.be.revertedWith("Abstract__NotEnoughETH")
              })
              it("Stores highest bid on contract and doesn't allow to bid if next bid value is less or the same as highest one", async () => {
                  const txResponse = await abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.15") })
                  const txReceipt = await txResponse.wait()
                  const our_val = txReceipt.events[0].args.amount
                  console.log(`Bid Value: ${our_val.toString()}`)
                  const contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)

                  assert.equal(our_val.toString(), contractBalance)
                  await expect(abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith("Didn't send enough ETH!")
              })
              it("For first and rest NFT bids emits event and return previous bid to owner", async () => {
                  const userBal = await ethers.provider.getBalance(user.address)
                  const txResponse = await abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.15") })
                  const txReceipt = await txResponse.wait()
                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  await expect(txResponse).to.emit(abstractInstanceExternal, "FirstNFTBidPlaced")
                  const userAfterBid = await ethers.provider.getBalance(user.address)

                  bidder = accounts[3]
                  secAbstractInstanceExternal = await abstractImpulseNFT.connect(bidder)

                  await expect(secAbstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.27") })).to.emit(
                      abstractInstanceExternal,
                      "NFTBidPlaced"
                  )
                  const userEndBalance = await ethers.provider.getBalance(user.address)

                  assert.equal(userBal.sub(ethers.utils.parseEther("0.15")).sub(gasCost).toString(), userAfterBid.toString())
                  assert.equal(userBal.sub(gasCost), userEndBalance.toString())
              })
              it("Allows user to bid an NFT", async function () {
                  const tx = await abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("1") })

                  assert(tx)
              })
              it("Revert if bidding is closed for NFT", async () => {
                  await abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.45") })
                  await abstractImpulseNFT.tokenBiddingEnder(0)

                  await expect(abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.77") })).to.be.revertedWith(
                      "Abstract__BiddingClosedForThisNFT"
                  )
              })
              /**
                 * @dev Tests to be done:
                  
                   1. AcceptBid()
                   2. TokenBiddingEnder()
                   3. TokenTransfer()
                   4. Withdraw()
                   5. Getters()
                 */
          })
      })
