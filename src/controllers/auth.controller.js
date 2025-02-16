import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiRespones.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
// Generating access and refresh token
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    // console.log("The Refresh Token", refreshToken);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error)
    throw new ApiError(500, "There is Problem while generation Tokens");
  }
};


// register user
const registerUser = asyncHandler(async (req, resp) => {
  const {
    fullName,
    email,
    password,
  } = req.body;

  console.log(req.body)
  try {
    if ([email, password, fullName].some((field) => field?.trim() === "")) {
      throw new ApiError(504, "Fields cannot be empty!", null)
    }

    const existedUser = await User.findOne({ $or: [{ email }] });
    if (existedUser) {
      throw new ApiError(504, "User with this email already exist, please try different email!", null)
    }

    const user = await User.create({
      fullName,
      email,
      password,
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(503, "Error while creating a user!", null)
    }

    return resp
      .status(200)
      .json(
        new ApiResponse(
          200,
          createdUser,
          `Congratualation! ${fullName}, Your account has been successfully created.`
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(503, error.message, error)
  }
});


// login user
const loginUser = asyncHandler(async (req, resp) => {
  const { email, password } = req.body;
  try {
    if (!email) {
      throw new ApiError(405, "Email cannot be empty!", null);
    }
    if (!password) {
      throw new ApiError(405, "Password cannot be empty!", null);
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(405, "User with this email not exist in our system!", null);
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(405, "Invalid Credentials, please try again with correct credentials!", null);
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    };

    return resp
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { user: loggedInUser, accessToken },
          `Welcome ${loggedInUser?.fullName} to dashboard`
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(503, error.message, error);
  }
});

// login with token
const loginWithToken = asyncHandler(async (req, resp) => {
  const id = req.user?._id;
  if (!id) {
    throw new ApiError(401, "User is not authenticated");
  }
  const user = await User.findById(id);
  return resp
    .status(200)
    .json(new ApiResponse(200, { user }, "User fetched Successfully"));
});

// logout user
const logoOutUser = asyncHandler(async (req, resp) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: false,
    secure: false,
  };
  return resp
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logout Successfully"));
});

// forgot password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  try {
    if (!email) {
      throw new ApiError(401, "Email cannot be empty", null)
    }
    const userExist = await User.findOne({ email });
    if (!userExist) {
      throw new ApiError(401, "User not found", null)
    }

    const token = jwt.sign(
      { email: email, _id: userExist._id },
      process.env.FORGOT_TOKEN_SECRET,
      { expiresIn: "5m" }
    );
    const link = `http://localhost:5173/reset_password/${userExist._id}/${token}`;
    
    console.log(link)

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          {},
          `Forgort password link sent successfully to ${userExist.email}`
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(503, error.message, error);
  }
});

// reset password
const resetPassword = asyncHandler(async (req, resp) => {
  try {
    const { id, token } = req.params;
    const { password } = req.body;
    const userExist = await User.findOne({ _id: id });
    if (!userExist) {
      throw new ApiError(404, "User not found!");
    }
    const verify = jwt.verify(token, process.env.FORGOT_TOKEN_SECRET);

    const user = verify.email;

    if (!user) {
      return new ApiError(401, "Something went wrong or Token Expired");
    }
    if (!password) {
      throw new ApiError(404, "Password cannot be empty");
    }
    const salt = await bcrypt.genSalt(10);

    // Hash the password along with the new salt
    const hashedPassword = await bcrypt.hash(password, salt);
    const resetedPassword = await User.findByIdAndUpdate(
      { _id: id },
      {
        $set: {
          password: hashedPassword,
        },
      }
    );
    const updatedUser = await User.findOne({ email: user }).select(
      "-password -refreshToken"
    );
    return resp
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Password Changed Successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(503, "Something went wrong!", error);
  }
});

// Change current password
const changeCurrentPassword = asyncHandler(async (req, resp) => {
  const { currentPassword, newPassword } = req.body;
  console.log(currentPassword);
  try {
    if (!currentPassword || !newPassword) {
      throw new ApiError(401, "Fields cannot be empty");
    }

    const user = await User.findById(req.user?._id.toString());

    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, "Invalid current Password");
    }

    user.password = newPassword;

    await user.save({ validateBeforeSave: false });

    return resp
      .status(200)
      .json(new ApiResponse(200, {}, "Password Changed Successfully"));
  } catch (error) {
    throw new ApiError(503, "Internal Server Error", null);
  }
});

// Refreshing access token
const refreshAccessToken = asyncHandler(async (req, resp) => {
  // console.log("yes");
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request!!");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    if (!decodedToken) {
      throw new ApiError(401, "Not a Valid Incoming Refresh token");
    }

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used");
    }

    const options = {
      httpOnly: false,
      secure: false,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );
    return resp
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access Token Refreshed Successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});

const verificationOfEmail = asyncHandler(async (req, resp) => {
  const { token } = req.query;
  try {
    const decoded = jwt.verify(token, "you and me");
    const user = await User.findById(decoded.userId);

    if (!user) {
      throw new ApiError(401, "User not found or Invalid token");
    }
    if (user.verified) {
      return resp
        .status(201)
        .json(new ApiResponse(201, {}, "Email already has been verfied!"));
    }
    user.verified = true;
    await user.save();
    return resp
      .status(201)
      .json(new ApiResponse(201, {}, "Email verified successfully"));
  } catch (error) {
    console.log(error);
    throw new ApiError(503, "Internal Server Error or Invalid Token", error);
  }
});


const resendVerificationLink = asyncHandler(async (req, resp) => {
  const user = req.user
  try {
    if (!user) {
      throw new ApiError(405, "User not authenticated or invalid access token")
    }
    const emailSending = await emailVerificationMessage(user)
    return resp.status(201).json(
      new ApiResponse(201, emailSending, "Email sent successfully!")
    )
  } catch (error) {
    console.log(error)
    throw new ApiError(503, error.message, error)
  }
})

export {
  registerUser,
  loginUser,
  loginWithToken,
  logoOutUser,
  forgotPassword,
  resetPassword,
  changeCurrentPassword,
  refreshAccessToken,
  verificationOfEmail,
  resendVerificationLink
};
