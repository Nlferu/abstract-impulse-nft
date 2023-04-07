const networkConfig = {
    31337: {
        name: "localhost",
    },
    5: {
        name: "goerli",
    },
    11155111: {
        name: "sepolia",
    },
    1: {
        name: "mainnet",
    },
}

const motherContract = "0xaBC27F4fa9dae4829575A3DF7958b9d80872c8a8"

const developmentChains = ["hardhat", "localhost"]
const DECIMALS = "18"
const INITIAL_PRICE = "200000000000000000000"
const AUCTION_DURATION = 30

const uploadedImagesURIs = "../Abstract_Impulse_NFT/utils/uploadedURIs/uploadedImagesURIs.txt"
const uploadedMetadataURIs = "../Abstract_Impulse_NFT/utils/uploadedURIs/uploadedMetadataURIs.txt"

module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_PRICE,
    AUCTION_DURATION,
    uploadedImagesURIs,
    uploadedMetadataURIs,
    motherContract,
}
