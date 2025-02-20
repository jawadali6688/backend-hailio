import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiRespones.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs"
import { uploadOnCloudinary } from "../utils/cloundinary.js";

// Helper function to check cloning status
const checkCloningStatus = async (voiceId) => {
    const maxRetries = 10;
    let attempts = 0;

    while (attempts < maxRetries) {
        try {
            const response = await axios.get(
                `https://api.elevenlabs.io/v1/voices/${voiceId}`,  // ✅ Correct endpoint
                {
                    headers: {
                        "xi-api-key": process.env.ELEVEN_LABS_API_KEY,  // ✅ Correct API key format
                    },
                }
            );

            if (response.data.status === "ready") {
                return response.data.voice_id;  // ✅ Return the cloned voice ID
            } else if (response.data.status === "failed") {
                throw new Error("❌ Voice cloning failed.");
            }

            await new Promise((resolve) => setTimeout(resolve, 5000));
        } catch (error) {
            console.error("❌ Error checking cloning status:", error.response?.data || error.message);
            throw new Error("⚠️ Failed to retrieve voice cloning status.");
        }

        attempts++;
    }

    throw new Error("⏳ Voice cloning took too long. Try again later.");
};

// Voice Cloning API
const voiceCloning = asyncHandler(async (req, res) => {
    try {
        console.log("📥 Received request:", req.body);
        const { fileUrl, voiceName } = req.body;

        if (!fileUrl || !voiceName) {
            return res.status(400).json({ error: "❌ Missing required parameters (fileUrl, voiceName)" });
        }

        // ✅ Prepare FormData (multipart/form-data)
        const formData = new FormData();
        formData.append("name", voiceName); 
        formData.append("files", fileUrl);  // ✅ Pass file URL correctly

        // ✅ Step 1: Start voice cloning
        const cloneResponse = await axios.post(
            "https://api.elevenlabs.io/v1/voices/add",
            formData,
            {
                headers: {
                    "xi-api-key": process.env.ELEVEN_LABS_API_KEY,  // ✅ Correct API key format
                    ...formData.getHeaders(),
                },
            }
        );

        if (!cloneResponse.data || !cloneResponse.data.voice_id) {
            return res.status(500).json({ error: "❌ Failed to start voice cloning." });
        }

        const clonedVoiceId = cloneResponse.data.voice_id;

        // ✅ Step 2: Wait until cloning is completed
        console.log("⏳ Waiting for voice cloning to complete...");
        const finalVoiceId = await checkCloningStatus(clonedVoiceId);

        // ✅ Step 3: Return the final voice ID
        res.json({ finalVoiceId, message: "✅ Voice cloning completed successfully!" });
    } catch (error) {
        console.error("❌ Voice Cloning Error:", error.response?.data || error.message);
        res.status(500).json({ error: error.message || "⚠️ Internal server error" });
    }
});


const textToSpeech = asyncHandler(async (req, resp) => {
    console.log(req.body);
    const { text, speed, voice_id } = req.body;

    try {
        const headers = {
            'Authorization': `Bearer ${process.env.PLAYDIALOG_API_KEY}`,
            'Content-Type': 'application/json',
            'X-USER-ID': process.env.PLAYDIALOG_USER_ID
        };

        if (!text) {
            throw new ApiError(403, "Text cannot be empty!", null);
        }

        const jsonData = {
            model: 'PlayDialog',
            text: text,
            voice: voice_id,
            outputFormat: 'wav',
            speed: speed,
        };

        const response = await axios.post('https://api.play.ai/api/v1/tts/stream', jsonData, { 
            headers, 
            responseType: 'arraybuffer' // Ensure binary data is received
        });

        // Set the correct Content-Type
        resp.setHeader('Content-Type', 'audio/wav');
        resp.setHeader('Content-Length', response.data.byteLength);

        return resp.status(200).send(response.data); // Send raw audio data

    } catch (error) {
        console.log(error)
        console.log(error.message);
        throw new ApiError(503, error.message, error);
    }
});


export { voiceCloning, textToSpeech };
