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

// Goerli
const motherContract = "0x9cfefaFA8877363623B83210b90F707Bf67E2eD2"

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
