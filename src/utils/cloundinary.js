import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';


cloudinary.config({
    cloud_name: 'dvuynjvai',
    api_key: '667851458283643',
    api_secret: 'zM_cZ2Lio8HH5vHz4qEIJ8_ljZo'
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        console.log(localFilePath, "Local path")
        if (!localFilePath) return null
    const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto"
    })
    console.log("File is uploaded on cloudinary and the file path is: ", response.url)
    fs.unlinkSync(localFilePath);
    return response

    } catch (error) {
        fs.unlinkSync(localFilePath); 
        return null 
    }
}
export {uploadOnCloudinary}

