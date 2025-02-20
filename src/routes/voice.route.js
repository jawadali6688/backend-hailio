import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { textToSpeech, voiceCloning } from "../controllers/voice.controller.js";

const router = Router()

router.route("/clone_voice").post(voiceCloning)

router.route("/text_to_speech").post(textToSpeech)

export default router