const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Abstract NFT Unit Tests", function () {
          let abstractImpulseNFT, abstractImpulseInstance, resMintTx, recMintTx, tokenId, deployer, user

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              // Deploying AbstractImpulseNFT
              await deployments.fixture(["AbstractImpulseNFT"])
              abstractImpulseNFT = await ethers.getContract("AbstractImpulseNFT")
          })

          /**
            * @dev Tests to be done in order:
             
            1. Constructor()
               * It assigns correct owner ✔️
               * It gives contract correct name and symbol ✔️
               * It shows 0 minted tokens ✔️
            2. mintNFT()
               * It creates new tokenId (NFT) and emit's (minter, tokenId) ✔️
               * It assigns correct tokenURI to created NFT and emit's (tokenURI) ✔️
               * It set's correct starting price for created NFT ✔️
               * It set's auction starting time for created NFT ✔️
               * It throws error if called by external user (only owner can mint NFT) ✔️
            3. placeBid()
               * It reverts if called by contract owner ✔️
               * It reverts if tokenId doesn't exist ✔️
               * It reverts if auction already finished for given tokenId ✔️
               * It extends auction time if auction is close to ending and bid is received
               * It reverts if amount sent is less than start price for given tokenId if first bid
               * It reverts if amount sent is less than lastest bid plus min bid amount for given tokenId if not first bid
               * It transfers latest lower bid to correct bidder if higher bid received and emit's (bid, transfer) if not first bid
               * It assigns highestBidder per tokenId
               * It assigns highestBid per tokenId
               * It emit's (bid, bidder, tokenId)
            4. tokenURI()
               * It returns correct tokenURI per tokenId
            5. approve(), transferFrom(), safeTransferFrom(), safeTransferFrom()
               * It is usable for tokenId's, which auction's have finished and minBid received
               * It is not allowed to use for tokenId's for which bidding is still ongoing            
            6. setApprovalForAll()
               * It reverts once used
            7. acceptBid()
               * It is usable for only owner
               * It is usable for tokenId's for which auction already finished only
               * It reverts if given tokenId doesn't exist
               * It reverts if there was no bid received for given tokenId
               * It withdraw's money back to owner for each tokenId and emit's (bid, transfer)
               * It approve's highest bidding address per tokenId to claim NFT and emit's (owner, approvedAddress, tokenId)
            8. withdrawMoney()
               * It is usable for only owner
               * It is usable for tokenId's for which auction already finished only
               * It reverts if given tokenId doesn't exist
               * It withdraw's money back to owner for each tokenId and emit's (bid, transfer)
            9. renewAuction()
               * It is usable for only owner
               * It is usable for tokenId's for which auction already finished only
               * It reverts if given tokenId doesn't exist
               * It reverts if there was bid received for given tokenId
               * It renew and sets correct auction time for given tokenId and emit's (time, tokenId)
            10. getters()
               * It displays correct data
            */
          // --------------------------------------------------------------------------------------------------------------------------
          describe("Constructor", () => {
              it("Initializes the NFT Correctly.", async () => {
                  const owner = await abstractImpulseNFT.owner()
                  const name = await abstractImpulseNFT.name()
                  const symbol = await abstractImpulseNFT.symbol()
                  const tokenCounter = await abstractImpulseNFT.totalSupply()

                  assert.equal(owner, deployer.address)
                  assert.equal(name, "Abstract Impulse")
                  assert.equal(symbol, "AIN")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })
          // --------------------------------------------------------------------------------------------------------------------------
          describe("Mint NFT", () => {
              beforeEach(async () => {
                  // Minting NFT
                  resMintTx = await abstractImpulseNFT.mintNFT("tokenURIx")
                  recMintTx = await resMintTx.wait()
                  tokenId = recMintTx.events[1].args.tokenId
              })
              it("It creates new tokenId (NFT) and emit's (minter, tokenId)", async function () {
                  // We have to use 1 index as "_mint" function has index 0
                  const minter = recMintTx.events[1].args.minter
                  console.log(`Minter: ${minter} TokenId: ${tokenId}`)
                  const tokenCounter = await abstractImpulseNFT.totalSupply()

                  assert.equal(tokenCounter, 1)
                  assert.equal(minter == deployer.address, tokenId == 0)
                  await expect(abstractImpulseNFT.mintNFT("tokenURIx")).to.emit(abstractImpulseNFT, `NFT_Minted`)
              })
              it("It assigns correct tokenURI to created NFT and emit's (tokenURI)", async function () {
                  const tokenURI = recMintTx.events[2].args.uri
                  tokenId = recMintTx.events[2].args.tokenId
                  console.log(`TokenURI: ${tokenURI} TokenId: ${tokenId}`)
                  const setTokenURI = await abstractImpulseNFT.tokenURI(tokenId)

                  assert.equal(tokenURI, setTokenURI)
                  await expect(abstractImpulseNFT.mintNFT("tokenURIx")).to.emit(abstractImpulseNFT, `NFT_SetTokenURI`)
              })
              it("It set's correct starting price for created NFT", async function () {
                  const price = await abstractImpulseNFT.getHighestBid(tokenId)
                  console.log(`Price: ${price}`)

                  // 0.1 ETH
                  assert.equal(price, 100000000000000000)
              })
              it("It set's auction starting time for created NFT", async function () {
                  const time = await abstractImpulseNFT.getTime(0)
                  console.log(`Time: ${time}`)

                  assert.equal(time, 30)
              })
              it("It throws error if called by external user (only owner can mint NFT)", async function () {
                  user = accounts[1]
                  // In order to use above account we have to first connect it to our mother contract instance
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)

                  await expect(abstractImpulseInstance.mintNFT("tokenURIxx")).to.be.revertedWith("Ownable: caller is not the owner")
              })
          })
          // --------------------------------------------------------------------------------------------------------------------------
          describe("Place Bid", () => {
              beforeEach(async () => {
                  // Minting NFT
                  resMintTx = await abstractImpulseNFT.mintNFT("tokenURIx")
                  recMintTx = await resMintTx.wait()
                  tokenId = recMintTx.events[1].args.tokenId

                  // Connecting External User
                  user = accounts[1]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
              })
              it("It reverts if called by contract owner", async function () {
                  await expect(abstractImpulseNFT.placeBid(0, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith(
                      "Abstract__ContractOwnerIsNotAllowedToBid"
                  )
              })
              it("It reverts if tokenId doesn't exist", async function () {
                  await expect(abstractImpulseInstance.placeBid(1, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith(
                      "Abstract__NotExistingTokenId"
                  )
              })
              it("It reverts if auction already finished for given tokenId", async function () {
                  // Increasing time by 30s
                  await network.provider.send("evm_increaseTime", [30])
                  // Mining new block
                  await network.provider.send("evm_mine", [])

                  await expect(abstractImpulseInstance.placeBid(0, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith(
                      "Abstract__AuctionFinishedForThisNFT"
                  )
              })
              it("It extends auction time if auction is close to ending and bid is received", async function () {})
              it("It reverts if amount sent is less than start price for given tokenId if first bid", async function () {})
              it("It reverts if amount sent is less than lastest bid plus min bid amount for given tokenId if not first bid", async function () {})
              it("It transfers latest lower bid to correct bidder if higher bid received and emit's (bid, transfer) if not first bid", async function () {})
              it("It assigns highestBidder per tokenId", async function () {})
              it("It assigns highestBid per tokenId", async function () {})
              it("It emit's (bid, bidder, tokenId)", async function () {})
          })

          //   it("Allows owner to mint an NFT", async function () {
          //       const tokenCounter = await abstractImpulseNFT.getTokenCounter()
          //       const txResponse = await abstractImpulseNFT.mintNFT("tokenURI", "nftTitle")

          //       assert(txResponse)
          //       assert.equal(tokenCounter.toString(), "1")
          //   })
          //   it("Emits event when NFT is minted", async function () {
          //       const txResponse = await abstractImpulseNFT.mintNFT("Token_URI", "NFT_Title")
          //       const txReceipt = await txResponse.wait()
          //       // We have to use 1 index as "_mint" function has index 0
          //       const minter = txReceipt.events[1].args.minter
          //       const title = txReceipt.events[1].args.title
          //       console.log(`Minter: ${minter} Title: ${title}`)

          //       assert.equal(minter == deployer.address, title == "NFT_Title")
          //       await expect(abstractImpulseNFT.mintNFT("Token_URI", "NFT_Title")).to.emit(abstractImpulseNFT, `NFTMinted`)
          //   })
          //   it("Not allows accounts other than owner to mint an NFT", async function () {
          //       const maliciousAccount = accounts[2]
          //       // In order to use above account we have to first connect it to our mother contract instance
          //       const abstractExternal = await abstractImpulseNFT.connect(maliciousAccount)

          //       await expect(abstractExternal.mintNFT("tokenURI", "nftTitle")).to.be.revertedWith("Ownable: caller is not the owner")
          //   })
          //   it("Show the correct owner and balance of NFT's", async function () {
          //       const deployerAddress = deployer.address
          //       const deployerBalance = await abstractImpulseNFT.balanceOf(deployerAddress)
          //       const owner = await abstractImpulseNFT.ownerOf("0")

          //       // Second Mint
          //       await abstractImpulseNFT.mintNFT("tokenURI2", "nftTitle2")
          //       const secBalance = await abstractImpulseNFT.balanceOf(deployerAddress)
          //       const secOwner = await abstractImpulseNFT.ownerOf("1")

          //       assert.equal(deployerBalance.toString(), "1")
          //       assert.equal(owner, deployerAddress)
          //       assert.equal(secBalance.toString(), "2")
          //       assert.equal(secOwner, deployerAddress)
          //       await expect(abstractImpulseNFT.ownerOf("2")).to.be.revertedWith("ERC721: invalid token ID")
          //   })
          //   it("Assigns correct tokenId to tokenURI", async function () {
          //       const assignedURI = await abstractImpulseNFT.getTokenIdToTokenURI(0)
          //       await abstractImpulseNFT.mintNFT("Token_URI", "NFT_Title")
          //       const secondAssignedURI = await abstractImpulseNFT.getTokenIdToTokenURI(1)

          //       assert.equal(assignedURI, "tokenURI")
          //       assert.equal(secondAssignedURI, "Token_URI")
          //   })

          //   describe("Place Bid", () => {
          //       beforeEach(async () => {
          //           const txResponse = await abstractImpulseNFT.mintNFT("tokenURI", "nftTitle")
          //           await txResponse.wait(1)
          //           // External User Of Our Contract
          //           user = accounts[2]
          //           abstractInstanceExternal = await abstractImpulseNFT.connect(user)
          //           //const owner = await abstractImpulseNFT.owner()
          //       })
          //       it("Not allows owner to bid an NFT", async function () {
          //           await expect(abstractImpulseNFT.placeBid(0, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith(
          //               "Abstract__ContractOwnerIsNotAllowedToBid"
          //           )
          //       })
          //       it("Revert if passed tokenId does not exist", async () => {
          //           await expect(abstractInstanceExternal.placeBid(1, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith(
          //               "Abstract__NotExistingTokenId"
          //           )
          //       })
          //       it("For first NFT revert if placed bid value is 0 or less", async () => {
          //           await expect(abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0") })).to.be.revertedWith("Abstract__NotEnoughETH")
          //       })
          //       it("Stores highest bid on contract and doesn't allow to bid if next bid value is less or the same as highest one", async () => {
          //           const txResponse = await abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.15") })
          //           const txReceipt = await txResponse.wait()
          //           const our_val = txReceipt.events[0].args.amount
          //           console.log(`Bid Value: ${our_val.toString()}`)
          //           const contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)

          //           assert.equal(our_val.toString(), contractBalance)
          //           await expect(abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.15") })).to.be.revertedWith("Abstract__NotEnoughETH")
          //       })
          //       it("For first and rest NFT bidding emits event and return previous bid to owner", async () => {
          //           const userBal = await ethers.provider.getBalance(user.address)
          //           const txResponse = await abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.15") })
          //           const txReceipt = await txResponse.wait()
          //           const { gasUsed, effectiveGasPrice } = txReceipt
          //           const gasCost = gasUsed.mul(effectiveGasPrice)

          //           await expect(txResponse).to.emit(abstractInstanceExternal, "FirstNFTBidPlaced")
          //           const userAfterBid = await ethers.provider.getBalance(user.address)

          //           bidder = accounts[3]
          //           secAbstractInstanceExternal = await abstractImpulseNFT.connect(bidder)

          //           await expect(secAbstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.27") })).to.emit(
          //               abstractInstanceExternal,
          //               "NFTBidPlaced"
          //           )
          //           const userEndBalance = await ethers.provider.getBalance(user.address)

          //           assert.equal(userBal.sub(ethers.utils.parseEther("0.15")).sub(gasCost).toString(), userAfterBid.toString())
          //           assert.equal(userBal.sub(gasCost), userEndBalance.toString())
          //       })
          //       it("Allows user to bid an NFT", async function () {
          //           const tx = await abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("1") })

          //           assert(tx)
          //       })
          //       it("Revert if bidding is closed for NFT", async () => {
          //           await abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.45") })
          //           await abstractImpulseNFT.tokenBiddingEnder(0)

          //           await expect(abstractInstanceExternal.placeBid(0, { value: ethers.utils.parseEther("0.77") })).to.be.revertedWith(
          //               "Abstract__BiddingClosedForThisNFT"
          //           )
          //       })
          //   })
      })
