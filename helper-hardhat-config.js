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

const developmentChains = ["hardhat", "localhost"]
const DECIMALS = "18"
const INITIAL_PRICE = "200000000000000000000"
const AUCTION_DURATION = 30

const frontEndContractsFile = "../Abstract_Impulse_NFT_Front/constants/networkMapping.json"
const frontEndAbiLocation = "../Abstract_Impulse_NFT_Front/constants/"

const uploadedImagesURIs = "../Abstract_Impulse_NFT/utils/uploadedURIs/uploadedImagesURIs.txt"
const uploadedMetadataURIs = "../Abstract_Impulse_NFT/utils/uploadedURIs/uploadedMetadataURIs.txt"

module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_PRICE,
    AUCTION_DURATION,
    frontEndContractsFile,
    frontEndAbiLocation,
    uploadedImagesURIs,
    uploadedMetadataURIs,
    motherContract,
}
