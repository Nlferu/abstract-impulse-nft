// This is uploading our Images and MetaData to Pinata

const pinataSDK = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")
require("dotenv").config()

const pinataApiKey = process.env.PINATA_API_KEY
const pinataApiSecret = process.env.PINATA_API_SECRET
const pinata = new pinataSDK(pinataApiKey, pinataApiSecret)

// Uploading Images To Pinata Function
async function storeImages(imagesFilePath) {
    // Getting full path to images
    const fullImagesPath = path.resolve(imagesFilePath)
    const files = fs.readdirSync(fullImagesPath).filter((file) => file.includes(".jpg"))
    console.log(`Our Images:`)
    console.log(files)

    let responses = []
    console.log("----------------------------------------------------")
    console.log("Uploading Images To Pinata...")
    for (fileIndex in files) {
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`)
        const options = {
            pinataMetadata: {
                name: files[fileIndex],
            },
        }
        try {
            console.log(`Pinning File With Index: ${fileIndex} To IPFS...`)
            await pinata
                .pinFileToIPFS(readableStreamForFile, options)
                .then((result) => {
                    responses.push(result)
                })
                .catch((err) => {
                    console.log(err)
                })
        } catch (error) {
            console.log(error)
        }
    }
    return { responses, files }
}

// Uploading MetaData To Pinata Function
async function storeTokenUriMetadata(metadata) {
    const options = {
        pinataMetadata: {
            name: metadata.name,
        },
    }
    try {
        console.log("----------------------------------------------------")
        console.log("Pinning Metadata To IPFS...")
        const response = await pinata.pinJSONToIPFS(metadata, options)
        return response
    } catch (error) {
        console.log(error)
    }
    return null
}

module.exports = { storeImages, storeTokenUriMetadata }
