import mongoose, {Schema} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
const userSchema = new Schema(
    {
      accountType: {
        type: String,
        enum: ["user", "test", "admin"],
        required: true,
        default: "user"
      },
      fullName: {
        type: String,
      },
      username: {
        type: String,
        default: "jsf_ai_"
      },
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
      avatar: {
        type: String,
        default: "https://cdn-icons-png.flaticon.com/512/6596/6596121.png"
      },
      password: {
        type: String,
        required: [true, "Password is required"],
      },
      refreshToken: {
        type: String,
      },
      verified: {
        type: Boolean,
        default: false,
        required: true
      },
      voiceAccess: {
        type: Boolean,
        default: false,
        required: true
      },
     
    },
    { timestamps: true }
  );

userSchema.pre("save", async function (next) {
    try {
      if (!this.username || this.username === "FR8") {
        let baseUsername = "FR8";
        let count = 0;
        let username = baseUsername;
  
        // Find a unique username by appending a count to the base username
        while (true) {
          const existingUser = await this.constructor.findOne({ username });
          if (!existingUser) {
            // Unique username found, break the loop
            break;
          }
          count++;
          username = `${baseUsername}_${count}`;
        }
  
        this.username = username; // Set the unique username
      }
      next();
    } catch (error) {
      console.error(`Error while generating unique username: ${error}`);
      next(error);
    }
  });
  
  // Pre-save hook to hash passwords using bcrypt before saving
  userSchema.pre("save", async function (next) {
    try {
      // Only hash the password if it's modified or new
      if (!this.isModified("password")) {
        return next();
      }
  
      // Generate a salt
      const salt = await bcrypt.genSalt(10);
  
      // Hash the password along with the new salt
      const hashedPassword = await bcrypt.hash(this.password, salt);
  
      // Replace the plain text password with the hashed password
      this.password = hashedPassword;
      next();
    } catch (error) {
      console.error(`Error while hashing password: ${error}`);
      next(error);
    }
  });
  
  // Schema methods for password verification and token generation
  
  userSchema.methods.isPasswordCorrect = async function (password) {
    console.log("User password", password)
    return await bcrypt.compare(password, this.password);
  };
  
  userSchema.methods.generateAccessToken = async function () {
    return jwt.sign(
      {
        _id: this._id,
        username: this.username,
        email: this.email,
        fullName: this.fullName,
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
      }
    );
  };
  
  userSchema.methods.generateRefreshToken = async function () {
    return jwt.sign(
      {
        _id: this._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
      }
    );
  };
  
  export const User = mongoose.model("User", userSchema);
  