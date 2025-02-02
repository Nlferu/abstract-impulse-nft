const { assert, expect } = require("chai")
const { parseEther } = require("ethers/lib/utils")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains, AUCTION_DURATION } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Abstract NFT Unit Tests", function () {
          let abstractImpulseNFT, abstractImpulseInstance, resTx, recTx, tokenId, deployer, user, auctionDuration

          beforeEach(async () => {
              auctionDuration = 30
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              // Deploying AbstractImpulseNFT
              await deployments.fixture(["AbstractImpulseNFT"])
              abstractImpulseNFT = await ethers.getContract("AbstractImpulseNFT")
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Constructor", () => {
              it("Initializes the NFT Correctly.", async () => {
                  const owner = await abstractImpulseNFT.signer.address
                  const name = await abstractImpulseNFT.name()
                  const symbol = await abstractImpulseNFT.symbol()
                  const tokenCounter = await abstractImpulseNFT.totalSupply()

                  assert.equal(owner, deployer.address)
                  assert.equal(name, "Abstract Impulse")
                  assert.equal(symbol, "AIN")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Mint NFT", () => {
              beforeEach(async () => {
                  // Minting NFT
                  resTx = await abstractImpulseNFT.mintNFT("tokenURIx", auctionDuration)
                  recTx = await resTx.wait()
                  tokenId = recTx.events[1].args.tokenId
              })
              it("It creates new tokenId (NFT) and emit's (minter, tokenId)", async function () {
                  // We have to use 1 index as "_mint" function has index 0
                  const minter = recTx.events[1].args.minter
                  console.log(`Minter: ${minter} TokenId: ${tokenId}`)
                  const tokenCounter = await abstractImpulseNFT.totalSupply()

                  assert.equal(tokenCounter, 1)
                  assert.equal(minter == deployer.address, tokenId == 0)
                  await expect(abstractImpulseNFT.mintNFT("tokenURIx", auctionDuration)).to.emit(abstractImpulseNFT, `NFT_Minted`)
              })
              it("It assigns correct tokenURI to created NFT and emit's (tokenURI)", async function () {
                  const tokenURI = recTx.events[2].args.uri
                  tokenId = recTx.events[2].args.tokenId
                  console.log(`TokenURI: ${tokenURI} TokenId: ${tokenId}`)
                  const setTokenURI = await abstractImpulseNFT.tokenURI(tokenId)

                  assert.equal(tokenURI, setTokenURI)
                  await expect(abstractImpulseNFT.mintNFT("tokenURIx", auctionDuration)).to.emit(abstractImpulseNFT, `NFT_SetTokenURI`)
              })
              it("It assigns correct auction duration per tokenId, set's (time, price) and emit's (time, tokenId)", async () => {
                  auctionDuration = 180
                  const mintResponseTx = await abstractImpulseNFT.mintNFT("tokenURI_T", auctionDuration)
                  const mintReceiptTx = await mintResponseTx.wait()
                  const price = mintReceiptTx.events[1].args.price
                  const time = mintReceiptTx.events[3].args.time
                  tokenId = mintReceiptTx.events[3].args.tokenId

                  assert.equal(tokenId, 1)
                  assert.equal(time, auctionDuration)
                  assert.equal(price.toString(), parseEther("0.5").toString())
                  await expect(abstractImpulseNFT.mintNFT("tokenURIz", auctionDuration)).to.emit(abstractImpulseNFT, `NFT_AuctionTimeUpdated`).withArgs(time, 2)
              })
              it("It throws error if called by external user (only owner can mint NFT)", async function () {
                  user = accounts[1]
                  // In order to use above account we have to first connect it to our mother contract instance
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)

                  await expect(abstractImpulseInstance.mintNFT("tokenURIxx", auctionDuration)).to.be.revertedWith("Abstract__NotContractOwner")
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Place Bid", () => {
              beforeEach(async () => {
                  // Minting NFT
                  resTx = await abstractImpulseNFT.mintNFT("tokenURIx", auctionDuration)
                  recTx = await resTx.wait()
                  tokenId = recTx.events[1].args.tokenId

                  // Connecting External User
                  user = accounts[1]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
              })
              it("It reverts if called by contract owner", async function () {
                  await expect(abstractImpulseNFT.placeBid(0, { value: parseEther("0.5") })).to.be.revertedWith("Abstract__ContractOwnerIsNotAllowedToBid")
              })
              it("It reverts if tokenId doesn't exist", async function () {
                  await expect(abstractImpulseInstance.placeBid(1, { value: parseEther("0.5") })).to.be.revertedWith("Abstract__NotExistingTokenId")
              })
              it("It reverts if auction already finished for given tokenId", async function () {
                  // Increasing time by 30s
                  await network.provider.send("evm_increaseTime", [AUCTION_DURATION])
                  // Mining new block
                  await network.provider.send("evm_mine", [])

                  await expect(abstractImpulseInstance.placeBid(0, { value: parseEther("0.5") })).to.be.revertedWith("Abstract__AuctionFinishedForThisNFT")
              })
              it("It extends auction time if auction is close to ending and bid is received and emit's time and tokenId", async function () {
                  console.log(`Auction Time For ${tokenId} NFT Left: ${auctionDuration}`)

                  const resBidTx = await abstractImpulseInstance.placeBid(0, { value: parseEther("0.5") })
                  const recBidTx = await resBidTx.wait()
                  const time = recBidTx.events[0].args.time
                  tokenId = recBidTx.events[0].args.tokenId

                  console.log(`Auction Time For ${tokenId} NFT Left: ${time} After New Bid`)

                  assert.equal("149", time.toString()) // 120 + 29 as 1s passed after bidding
                  await expect(resBidTx).to.emit(abstractImpulseNFT, `NFT_AuctionTimeUpdated`)
              })
              it("It reverts if amount sent is less than start price for given tokenId if first bid", async function () {
                  await expect(abstractImpulseInstance.placeBid(0, { value: parseEther("0.49") })).to.be.revertedWith("Abstract__NotEnoughETH")
              })
              it("It reverts if amount sent is less than lastest bid plus min bid amount for given tokenId if not first bid", async function () {
                  await abstractImpulseInstance.placeBid(0, { value: parseEther("0.5") })
                  await expect(abstractImpulseInstance.placeBid(0, { value: parseEther("0.509") })).to.be.revertedWith("Abstract__NotEnoughETH")
              })
              it("It adds previous bids for pending withdrawal for losing bidder's and allow them to withdraw those", async function () {
                  // Below are also included in this test
                  // it("It assigns highestBidder per tokenId")
                  // it("It assigns highestBid per tokenId")
                  // it("It emit's (bid, bidder, tokenId)")
                  sec_user = accounts[2]
                  const startingBalance = parseEther("10000")
                  const txResponse = await abstractImpulseInstance.placeBid(0, { value: parseEther("15") })
                  let txReceipt = await txResponse.wait()
                  let bidVal = txReceipt.events[1].args.amount
                  const bidder = txReceipt.events[1].args.bidder
                  tokenId = txReceipt.events[1].args.tokenId
                  const time = txReceipt.events[0].args.time

                  console.log(`Bid Value: ${bidVal.toString()} WEI Bidder: ${bidder} tokenId: ${tokenId} Time Left: ${time}`)

                  let pendingWithdrawal = 0
                  let contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  let balanceETH = await ethers.provider.getBalance(user.address)
                  let secBalETH = await ethers.provider.getBalance(sec_user.address)
                  console.log(`Balance Of First User: ${balanceETH} ETH Second User: ${secBalETH} WEI Pending Withdrawal Balance: ${pendingWithdrawal}`)

                  let highestBid = "15"
                  let highestBidder = user.address
                  console.log(`Highest Bid: ${highestBid} Highest Bidder: ${highestBidder}`)

                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  assert.equal(bidder, user.address, highestBidder)
                  assert.equal(bidVal.toString(), contractBalance, highestBid)
                  assert.equal(balanceETH, startingBalance.sub(bidVal).sub(gasCost).toString())
                  await expect(txResponse).to.emit(abstractImpulseNFT, "NFT_BidPlaced")

                  abstractImpulseInstance = await abstractImpulseNFT.connect(sec_user)

                  const resRetTx = await abstractImpulseInstance.placeBid(0, { value: parseEther("30") })
                  const recRetTx = await resRetTx.wait()
                  const pendingBid = recRetTx.events[0].args.bid
                  const pendingBidder = recRetTx.events[0].args.bidder
                  const newBid = recRetTx.events[1].args.amount
                  pendingWithdrawal = ethers.utils.parseEther("15")
                  contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  console.log(`Pending Bid: ${pendingBid} For: ${pendingBidder} Pending Bid Added: ${bidVal} Pending Withdrawal Balance: ${pendingWithdrawal}`)

                  balanceETH = await ethers.provider.getBalance(user.address)
                  secBalETH = await ethers.provider.getBalance(sec_user.address)
                  console.log(`Balance Of First User: ${balanceETH} ETH Second User: ${secBalETH} WEI`)

                  highestBid = ethers.utils.parseEther("30")
                  highestBidder = sec_user.address
                  console.log(`New Highest Bid: ${highestBid} New Highest Bidder: ${highestBidder}`)

                  const newGas = recRetTx.gasUsed
                  const newGasPrice = recRetTx.effectiveGasPrice
                  const newGasCost = newGas.mul(newGasPrice)

                  assert.equal(pendingWithdrawal, parseEther("15").toString())
                  assert.equal(contractBalance.toString(), newBid.add(pendingBid).toString())
                  assert.equal(balanceETH.toString(), startingBalance.sub(bidVal).sub(gasCost).toString())
                  assert.equal(secBalETH.toString(), startingBalance.sub(newBid).sub(newGasCost).toString())
                  await expect(resRetTx).to.emit(abstractImpulseNFT, `NFT_AddedPendingBidsForWithdrawal`)

                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  const respTx = await abstractImpulseInstance.withdrawPending()
                  const recpTx = await respTx.wait()
                  const firstBidderBid = recpTx.events[0].args.bid
                  const firstBidder = recpTx.events[0].args.bidder
                  const firstBidderTx = recpTx.events[0].args.transfer
                  contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  balanceETH = await ethers.provider.getBalance(user.address)
                  console.log(`Pending Bid: ${firstBidderBid} Has Been Returned To: ${firstBidder} Transfer: ${firstBidderTx}`)

                  const newestGas = recpTx.gasUsed
                  const newestGasPrice = recpTx.effectiveGasPrice
                  const newestGasCost = newestGas.mul(newestGasPrice)

                  assert.equal(firstBidderBid.toString(), bidVal.toString())
                  assert.equal(firstBidder, user.address)
                  assert.equal(firstBidderTx, true)
                  assert.equal(contractBalance, parseEther("30").toString())
                  assert.equal(balanceETH.toString(), startingBalance.sub(gasCost).sub(newestGasCost).toString())
                  await expect(respTx).to.emit(abstractImpulseNFT, `NFT_PendingBidsWithdrawal`)
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Withdraw Pending", () => {
              beforeEach(async () => {
                  user = accounts[3]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  await abstractImpulseNFT.mintNFT("SomeNFT", auctionDuration)
                  await abstractImpulseNFT.mintNFT("SomeOtherNFT", auctionDuration)
              })
              it("It reverts if amount to withdraw is 0", async () => {
                  await expect(abstractImpulseInstance.withdrawPending()).to.be.revertedWith("Abstract__NotEnoughETH")
              })
              it("It reverts if transaction fails and keep pending amount to withdraw", async () => {})
              it("It withdraws bids from multiple tokens", async () => {
                  const startingContractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  const startingUserBalance = await ethers.provider.getBalance(user.address)

                  assert.equal(startingContractBalance, 0)
                  assert.equal(startingUserBalance, parseEther("10000").toString())

                  const firstResTx = await abstractImpulseInstance.placeBid(0, { value: parseEther("10") })
                  const firstRecTx = await firstResTx.wait()

                  const gas = firstRecTx.gasUsed
                  const gasPrice = firstRecTx.effectiveGasPrice
                  const gasCost = gas.mul(gasPrice)

                  const anotherBidder = accounts[4]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(anotherBidder)
                  await abstractImpulseInstance.placeBid(0, { value: parseEther("20") })

                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  const secondResTx = await abstractImpulseInstance.placeBid(1, { value: parseEther("16") })
                  const secondRecTx = await secondResTx.wait()

                  const newGas = secondRecTx.gasUsed
                  const newGasPrice = secondRecTx.effectiveGasPrice
                  const newGasCost = newGas.mul(newGasPrice)

                  abstractImpulseInstance = await abstractImpulseNFT.connect(anotherBidder)
                  await abstractImpulseInstance.placeBid(1, { value: parseEther("26") })
                  const midContractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)

                  assert.equal(midContractBalance, parseEther("72").toString())

                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  const thirdResTx = await abstractImpulseInstance.withdrawPending()
                  const thirdRecTx = await thirdResTx.wait()

                  const newestGas = thirdRecTx.gasUsed
                  const newestGasPrice = thirdRecTx.effectiveGasPrice
                  const newestGasCost = newestGas.mul(newestGasPrice)

                  const postContractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  const finalUserBalance = await ethers.provider.getBalance(user.address)

                  assert.equal(postContractBalance, parseEther("46").toString())
                  assert.equal(finalUserBalance, startingUserBalance.sub(gasCost).sub(newGasCost).sub(newestGasCost).toString())
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Save And Read TokenURI", () => {
              it("It returns correct tokenURI per tokenId", async () => {
                  await abstractImpulseNFT.mintNFT("FirstTokenURI", auctionDuration)
                  await abstractImpulseNFT.mintNFT("SecondTokenURI", auctionDuration)

                  let tokenURI = await abstractImpulseNFT.tokenURI(0)
                  assert.equal(tokenURI, "FirstTokenURI")
                  tokenURI = await abstractImpulseNFT.tokenURI(1)
                  assert.equal(tokenURI, "SecondTokenURI")
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Functions allowed to use: approve(), transferFrom(), safeTransferFrom(), safeTransferFrom()", () => {
              beforeEach(async () => {
                  user = accounts[3]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  await abstractImpulseNFT.mintNFT("FirstTokenURI", auctionDuration)
                  await abstractImpulseInstance.placeBid(0, { value: parseEther("0.5") })
                  await network.provider.send("evm_increaseTime", [AUCTION_DURATION + 119])
                  await network.provider.send("evm_mine", [])

                  tokenId = (await abstractImpulseNFT.totalSupply()) - 1
              })
              it("It is usable for tokenId's, which auction's have finished and minBid received if called by not approved owner it reverts approve() transferFrom()", async () => {
                  const highestBid = parseEther("0.5")
                  const highestBidder = user.address
                  console.log(`Bid: ${highestBid} Bidder: ${highestBidder} TokenId: ${tokenId}`)

                  await expect(abstractImpulseInstance.approve(user.address, tokenId)).to.be.revertedWith("ApprovalCallerNotOwnerNorApproved")
                  await expect(abstractImpulseInstance.transferFrom(deployer.address, user.address, tokenId)).to.be.revertedWith(
                      "TransferCallerNotOwnerNorApproved"
                  )
                  await expect(abstractImpulseNFT.approve(user.address, tokenId)).to.emit(abstractImpulseNFT, "Approval")
                  await expect(abstractImpulseNFT.transferFrom(deployer.address, user.address, tokenId)).to.emit(abstractImpulseNFT, "Transfer")
              })
              it("It is usable for tokenId's, which auction's have finished and minBid received if called by not approved owner it reverts safeTransferFrom()", async () => {
                  await expect(
                      abstractImpulseInstance["safeTransferFrom(address,address,uint256)"](deployer.address, user.address, tokenId)
                  ).to.be.revertedWith("TransferCallerNotOwnerNorApproved")
                  await expect(abstractImpulseNFT["safeTransferFrom(address,address,uint256)"](deployer.address, user.address, tokenId)).to.emit(
                      abstractImpulseNFT,
                      "Transfer"
                  )
              })
              it("It is usable for tokenId's, which auction's have finished and minBid received if called by not approved owner it reverts safeTransferFrom(_data)", async () => {
                  await expect(
                      abstractImpulseInstance["safeTransferFrom(address,address,uint256,bytes)"](deployer.address, user.address, tokenId, user.address)
                  ).to.be.revertedWith("TransferCallerNotOwnerNorApproved")
                  await expect(
                      abstractImpulseNFT["safeTransferFrom(address,address,uint256,bytes)"](deployer.address, user.address, tokenId, user.address)
                  ).to.emit(abstractImpulseNFT, "Transfer")
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Functions not allowed to be used by owner for lower bidder", () => {
              beforeEach(async () => {
                  user = accounts[3]
                  const anotherBidder = accounts[4]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  const abstractImpulseInstanceSecond = await abstractImpulseNFT.connect(anotherBidder)
                  await abstractImpulseNFT.mintNFT("FirstTokenURI", auctionDuration)
                  await abstractImpulseInstance.placeBid(0, { value: parseEther("0.5") })
                  await abstractImpulseInstanceSecond.placeBid(0, { value: parseEther("0.9") })
                  await network.provider.send("evm_increaseTime", [AUCTION_DURATION + 119])
                  await network.provider.send("evm_mine", [])

                  tokenId = (await abstractImpulseNFT.totalSupply()) - 1
              })
              it("It is not allowed to approve or transfer to other address than highest bidder", async () => {
                  await expect(abstractImpulseNFT.approve(user.address, tokenId)).to.be.revertedWith("Abstract__AddressIsNotHighestBidder")
                  await expect(abstractImpulseNFT.transferFrom(deployer.address, user.address, tokenId)).to.be.revertedWith(
                      "Abstract__AddressIsNotHighestBidder"
                  )
                  await expect(
                      abstractImpulseNFT["safeTransferFrom(address,address,uint256,bytes)"](deployer.address, user.address, tokenId, user.address)
                  ).to.be.revertedWith("Abstract__AddressIsNotHighestBidder")
                  await expect(abstractImpulseNFT["safeTransferFrom(address,address,uint256)"](deployer.address, user.address, tokenId)).to.be.revertedWith(
                      "Abstract__AddressIsNotHighestBidder"
                  )
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Functions not allowed to use: approve(), transferFrom(), safeTransferFrom(), safeTransferFrom()", () => {
              beforeEach(async () => {
                  user = accounts[3]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  await abstractImpulseNFT.mintNFT("TokenURI_X", auctionDuration)
                  await abstractImpulseInstance.placeBid(0, { value: parseEther("0.5") })
              })
              it("It is not allowed to use any of above functions for tokenId's for which bidding is still ongoing", async () => {
                  // abstractImpulseInstance ------------------------------------------------------------------------------------------------------------------
                  await expect(abstractImpulseInstance.approve(user.address, tokenId)).to.be.revertedWith("Abstract__AuctionStillOpenForThisNFT")
                  await expect(abstractImpulseInstance.transferFrom(deployer.address, user.address, tokenId)).to.be.revertedWith(
                      "Abstract__AuctionStillOpenForThisNFT"
                  )
                  await expect(
                      abstractImpulseInstance["safeTransferFrom(address,address,uint256)"](deployer.address, user.address, tokenId)
                  ).to.be.revertedWith("Abstract__AuctionStillOpenForThisNFT")
                  await expect(
                      abstractImpulseInstance["safeTransferFrom(address,address,uint256,bytes)"](deployer.address, user.address, tokenId, user.address)
                  ).to.be.revertedWith("Abstract__AuctionStillOpenForThisNFT")

                  // abstractImpulseNFT ------------------------------------------------------------------------------------------------------------------
                  await expect(abstractImpulseNFT.approve(user.address, tokenId)).to.be.revertedWith("Abstract__AuctionStillOpenForThisNFT")
                  await expect(abstractImpulseNFT.transferFrom(deployer.address, user.address, tokenId)).to.be.revertedWith(
                      "Abstract__AuctionStillOpenForThisNFT"
                  )
                  await expect(abstractImpulseNFT["safeTransferFrom(address,address,uint256)"](deployer.address, user.address, tokenId)).to.be.revertedWith(
                      "Abstract__AuctionStillOpenForThisNFT"
                  )
                  await expect(
                      abstractImpulseNFT["safeTransferFrom(address,address,uint256,bytes)"](deployer.address, user.address, tokenId, user.address)
                  ).to.be.revertedWith("Abstract__AuctionStillOpenForThisNFT")
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Set Approval For All Function", () => {
              it("It reverts once used", async () => {
                  user = accounts[4]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  await expect(abstractImpulseInstance.setApprovalForAll(user.address, true)).to.be.revertedWith("Abstract__FunctionDisabled")
                  await expect(abstractImpulseNFT.setApprovalForAll(user.address, true)).to.be.revertedWith("Abstract__FunctionDisabled")
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Accept Bid", () => {
              beforeEach(async () => {
                  tokenId = 0
                  user = accounts[1]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
              })
              it("It is usable for only owner and tokenId's received bid and only if auction already finished and emits three confirmations", async () => {
                  // Below is also included in this test
                  // it("It approve's highest bidding address per tokenId to claim NFT and emit's (owner, approvedAddress, tokenId)")
                  await abstractImpulseNFT.mintNFT("TokenURI_X", auctionDuration)
                  await abstractImpulseInstance.placeBid(0, { value: parseEther("0.5") })
                  await network.provider.send("evm_increaseTime", [AUCTION_DURATION + 119])
                  await network.provider.send("evm_mine", [])

                  await expect(abstractImpulseInstance.acceptBid(tokenId)).to.be.revertedWith("Abstract__NotContractOwner")
                  await expect(
                      abstractImpulseInstance["safeTransferFrom(address,address,uint256)"](deployer.address, user.address, tokenId)
                  ).to.be.revertedWith("TransferCallerNotOwnerNorApproved")

                  const resTx = await abstractImpulseNFT.acceptBid(tokenId)
                  const recTx = await resTx.wait()

                  const amount = recTx.events[0].args.amount // from withdrawMoney()
                  const transfer = recTx.events[0].args.transfer // from withdrawMoney()
                  const owner = recTx.events[1].args.owner // from approve()
                  const approved = recTx.events[1].args.approved // from approve()
                  tokenId = recTx.events[1].args.tokenId // from approve()
                  const tokenBidAccepted = recTx.events[2].args.tokenId // from NFT_BidAccepted()

                  console.log(
                      `Bid Accepted Amount: ${amount} Transfer: ${transfer} Owner: ${owner} Winner: ${approved} TokenId: ${tokenId} Bid Emit TokenId ${tokenBidAccepted}`
                  )
                  assert.equal(deployer.address, owner)
                  await expect(resTx).to.emit(abstractImpulseNFT, "NFT_BidAccepted")
                  await expect(abstractImpulseInstance["safeTransferFrom(address,address,uint256)"](deployer.address, user.address, tokenId)).to.emit(
                      abstractImpulseNFT,
                      "Transfer"
                  )
              })
              it("It reverts if auction not finished for given tokenId", async () => {
                  await abstractImpulseNFT.mintNFT("TokenURI_X", auctionDuration)
                  await expect(abstractImpulseNFT.acceptBid(tokenId)).to.be.revertedWith("Abstract__AuctionStillOpenForThisNFT")
              })
              it("It reverts if there was no bid received for given tokenId", async () => {
                  await abstractImpulseNFT.mintNFT("TokenURI_X", auctionDuration)
                  await network.provider.send("evm_increaseTime", [AUCTION_DURATION])
                  await network.provider.send("evm_mine", [])
                  await expect(abstractImpulseNFT.acceptBid(tokenId)).to.be.revertedWith("Abstract__NoBidReceivedForThisNFT")
              })
              it("It withdraw's money back to owner for each tokenId and emit's (bid, transfer)", async () => {
                  let contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  console.log(`Contract Starting Balance: ${contractBalance}`)

                  assert.equal(contractBalance, 0)

                  await abstractImpulseNFT.mintNFT("TokenURI_X", auctionDuration)
                  await abstractImpulseNFT.mintNFT("Tokki", auctionDuration)
                  const startingOwnerBalance = await ethers.provider.getBalance(deployer.address)
                  let resTx = await abstractImpulseInstance.placeBid(0, { value: parseEther("7") })
                  let recTx = await resTx.wait()
                  const firstBid = recTx.events[1].args.amount

                  contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  assert.equal(contractBalance, firstBid.toString())

                  resTx = await abstractImpulseInstance.placeBid(1, { value: parseEther("500") })
                  recTx = await resTx.wait()
                  const secondBid = recTx.events[1].args.amount
                  await network.provider.send("evm_increaseTime", [AUCTION_DURATION + 119])
                  await network.provider.send("evm_mine", [])

                  contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  resTx = await abstractImpulseNFT.acceptBid(0)
                  recTx = await resTx.wait()
                  let amount = recTx.events[0].args.amount
                  let transfer = recTx.events[0].args.transfer
                  let ownerBalance = await ethers.provider.getBalance(deployer.address)
                  const afterBidAcceptContractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)
                  const { gasUsed, effectiveGasPrice } = recTx
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  console.log(
                      `First Bid: ${firstBid / 10 ** 18} ETH Contract Balance: ${contractBalance / 10 ** 18} ETH Owner Balance: ${ownerBalance / 10 ** 18} ETH`
                  )

                  assert.equal(transfer, true)
                  assert.equal(firstBid.toString(), amount.toString())
                  assert.equal(contractBalance, firstBid.add(secondBid).toString())
                  assert.equal(afterBidAcceptContractBalance, secondBid.toString())
                  assert.equal(ownerBalance.toString(), startingOwnerBalance.add(firstBid).sub(gasCost).toString())

                  resTx = await abstractImpulseNFT.acceptBid(1)
                  recTx = await resTx.wait()
                  amount = recTx.events[0].args.amount
                  transfer = recTx.events[0].args.transfer
                  ownerBalance = await ethers.provider.getBalance(deployer.address)
                  contractBalance = await ethers.provider.getBalance(abstractImpulseNFT.address)

                  const newGasUsed = recTx.gasUsed
                  const newEffectiveGasPrice = recTx.effectiveGasPrice
                  const newGasCost = newGasUsed.mul(newEffectiveGasPrice)

                  console.log(
                      `Second Bid Accepted: ${amount / 10 ** 18} ETH Contract Balance: ${contractBalance / 10 ** 18} ETH Owner Balance: ${
                          ownerBalance / 10 ** 18
                      } ETH`
                  )

                  assert.equal(transfer, true)
                  assert.equal(secondBid.toString(), amount.toString())
                  assert.equal(contractBalance, 0)
                  assert.equal(ownerBalance.toString(), startingOwnerBalance.add(firstBid).add(secondBid).sub(gasCost).sub(newGasCost).toString())
              })
          })
          // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
          describe("Renew Auction", () => {
              beforeEach(async () => {
                  tokenId = 0
              })
              it("It is usable only for tokenId's for which auction already finished and without bid received and can be called by owner only", async () => {
                  // Below is also included in this test
                  // it("It renew and sets correct auction time for given tokenId and emit's (time, tokenId)"
                  await abstractImpulseNFT.mintNFT("TokenURI_X", auctionDuration)

                  await network.provider.send("evm_increaseTime", [AUCTION_DURATION])
                  await network.provider.send("evm_mine", [])

                  resTx = await abstractImpulseNFT.renewAuction(tokenId)
                  recTx = await resTx.wait()
                  const time = recTx.events[0].args.time
                  tokenId = recTx.events[0].args.tokenId

                  console.log(`Time Left After Renewal: ${time}`)

                  assert.equal("30", time.toString())
                  await expect(resTx).to.emit(abstractImpulseNFT, "NFT_AuctionTimeUpdated")
              })
              it("It reverts if auction not finished for given tokenId", async () => {
                  await abstractImpulseNFT.mintNFT("TokenURI_X", auctionDuration)
                  await expect(abstractImpulseNFT.renewAuction(tokenId)).to.be.revertedWith("Abstract__AuctionStillOpenForThisNFT")
              })
              it("It reverts if there was bid received for given tokenId", async () => {
                  user = accounts[1]
                  abstractImpulseInstance = await abstractImpulseNFT.connect(user)
                  await abstractImpulseNFT.mintNFT("TokenURI_X", auctionDuration)

                  await abstractImpulseInstance.placeBid(0, { value: parseEther("0.5") })
                  await network.provider.send("evm_increaseTime", [AUCTION_DURATION + 119])
                  await network.provider.send("evm_mine", [])

                  await expect(abstractImpulseNFT.renewAuction(tokenId)).to.be.revertedWith("Abstract__BidReceivedForThisNFT")
              })
          })
      })
