import { Router } from "express";



import { verifyJWT } from "../middlewares/auth.middleware.js";
import { changeCurrentPassword, forgotPassword, loginUser, loginWithToken, logoOutUser, refreshAccessToken, registerUser, resendVerificationLink, resetPassword, verificationOfEmail } from "../controllers/auth.controller.js";

const router = Router();


router.route("/register").post(
  registerUser
);

router.route("/login").post(loginUser);

// Secured Routes
router.route("/login-with-token").post(verifyJWT, loginWithToken);

router.route("/logout").post(verifyJWT, logoOutUser);

router.route("/forgot_password").post(forgotPassword);

router.route("/reset_password/:id/:token").post(resetPassword);

router.route("/change_current_password").post(verifyJWT, changeCurrentPassword);

// refresh endpoint route
router.route("/refresh_token").get(verifyJWT, refreshAccessToken);

router.route("/verifyEmail").get(verificationOfEmail)

router.route("/send_verification_link").get(verifyJWT, resendVerificationLink)

export default router;
