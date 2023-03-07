const networkConfig = {
    31337: {
        name: "localhost",
        ethUsdPriceFeed: "0x9326BFA02ADD2366b30bacB125260Af641031331",
    },
    5: {
        name: "goerli",
        ethUsdPriceFeed: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    },
    11155111: {
        name: "sepolia",
    },
}

const developmentChains = ["hardhat", "localhost"]
const DECIMALS = "18"
const INITIAL_PRICE = "200000000000000000000"

const uploadedURIs = "../Abstract_Impulse_NFT/utils/uploadedURIs.txt"
const uploadedImagesURIs = "../VRFConsumerV2_Raffle_FrontEnd/constants/contractAddresses.json"
const uploadedMetadataURIs = "../VRFConsumerV2_Raffle_FrontEnd/constants/contractAbi.json"

module.exports = {
    networkConfig,
    developmentChains,
    DECIMALS,
    INITIAL_PRICE,
    uploadedURIs,
}
