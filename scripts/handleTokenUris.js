// This is editing our MetaData file

const fs = require("fs")
const { metadataTemplate } = require("../utils/metadataTemplate")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")
const { uploadedURIs } = require("../helper-hardhat-config")

const imagesLocation = "./images/"

async function handleTokenUris() {
    tokenUris = []
    // Uploading Images To Pinata
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    // Saving Uploaded Images URIs In "utils" folder under "uploadedURIs" file
    fs.writeFileSync(uploadedURIs, imageUploadResponses.toString())
    fs.writeFileSync(uploadedURIs, files.toString())
    console.log(imageUploadResponses.toString(), files.toString())

    for (imageUploadResponseIndex in imageUploadResponses) {
        // Create metadata
        // Upload metadata
        // Below we are just sticking data from "metadataTemplate" into "tokenUriMetadata" variable.
        let tokenUriMetadata = { ...metadataTemplate }

        // Editing Metadata
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".jpg", "")
        tokenUriMetadata.description = `Unique ${tokenUriMetadata.name} art`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name} metadata...`)

        // Store the JSON to pinata/IPFS
        // Uploading MetaData To Pinata
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)

        // Saving Uploaded Metadata URIs In "utils" folder under "uploadedURIs" file
        fs.writeFileSync(uploadedURIs, tokenUris.toString())
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
