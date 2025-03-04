// import { User } from "../models/user.model.js";
// import { ApiError } from "../utils/apiError.js";
// import { ApiResponse } from "../utils/apiRespones.js";
// import { asyncHandler } from "../utils/asyncHandler.js";

// // Get All Users
// const getAllUsers = asyncHandler(async (req, resp) => {
//     try {

//         const allUsers = await User.find({})

//         if (!allUsers) {
//             throw new ApiError(401, "Users not found!", null)
//         }
//         return resp.status(201).json(
//             new ApiResponse(201, allUsers, "Users fetched successfully")
//         )
//     } catch (error) {
//         console.log(error)
//         throw new ApiError(503, error.message, error)
//     }
// })




// export {
//     getAllUsers
// }