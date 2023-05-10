// This is editing our MetaData file

const fs = require("fs")
const { metadataTemplate } = require("../utils/metadataTemplate")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")
const { uploadedImagesURIs, uploadedMetadataURIs } = require("../helper-hardhat-config")

const imagesLocation = "./images/"

async function handleTokenUris() {
    tokenUris = []
    storeUris = []
    // Uploading Images To Pinata
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    // Saving Uploaded Images URIs In "utils" folder under "uploadedURIs" file
    for (imageUploadResponseIndex in imageUploadResponses) {
        if (imageUploadResponseIndex == 0) {
            console.log("Saving Images URIs To File...")
        }

        storeUris.push(`https://ipfs.io/ipfs/${imageUploadResponses[imageUploadResponseIndex].IpfsHash.toString()}` + "\n")
        fs.writeFileSync(uploadedImagesURIs, storeUris.toString().replace(/,/g, ""))
    }

    // Clearing Array...
    storeUris = []

    for (imageUploadResponseIndex in imageUploadResponses) {
        // Create metadata
        // Upload metadata
        // Below we are just sticking data from "metadataTemplate" into "tokenUriMetadata" variable.
        let tokenUriMetadata = { ...metadataTemplate }

        // Editing Metadata
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".jpg", "")
        tokenUriMetadata.description = `Unique ${tokenUriMetadata.name} hand painted piece of art`
        tokenUriMetadata.image = `https://ipfs.io/ipfs/${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name} metadata...`)

        // Store the JSON to pinata/IPFS
        // Uploading MetaData To Pinata
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`https://ipfs.io/ipfs/${metadataUploadResponse.IpfsHash}`)

        // Saving Uploaded Metadata URIs In "utils" folder under "uploadedURIs" file
        if (imageUploadResponseIndex == imageUploadResponseIndex.length) {
            console.log("Saving Metadata URIs To File...")
        }
        storeUris.push(`https://ipfs.io/ipfs/${metadataUploadResponse.IpfsHash.toString()}` + "\n")
        fs.writeFileSync(uploadedMetadataURIs, storeUris.toString().replace(/,/g, ""))
    }
    console.log("Token URIs uploaded! They are:")
    console.log(tokenUris)

    return tokenUris
}

handleTokenUris()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
