import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiRespones.js";
import axios from "axios";
import FormData from "form-data";
import fs from "fs"
import { uploadOnCloudinary } from "../utils/cloundinary.js";
import { User } from "../models/user.model.js";
import * as base64 from 'base64-arraybuffer';
import { ZyphraClient } from "@zyphra/client";
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
        const { fileUrl, voiceName, userId } = req.body;

        if (!fileUrl || !voiceName) {
            return res.status(400).json({ error: "Missing required parameters (fileUrl, voiceName)" });
        }
        const user = await User.findById(userId).select("clonedVoices");
        if (user.clonedVoices.length >= 4) {
            throw new ApiError(401, "Not allowed, you are reached to maximum voice clones limit.", null)
        }
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $push: { clonedVoices: { clonedName: voiceName, clonedUrl: fileUrl } } },
            { new: true }
        ).select("-password -refreshToken")

        console.log(updatedUser)

        return res.status(201).json(
            new ApiResponse(201, updatedUser, "Voice Cloned Successfully!")
        )
    } catch (error) {
        console.error("❌ Voice Cloning Error:", error.message, error);
       throw new ApiError(503, error.message, error)
    }
});

const textToSpeech = asyncHandler(async (req, resp) => {
    console.log(req.body);
    const { text, speed, audioUrl, userId, apiKey } = req.body;
    
    try {
        // Fetch audio from the provided URL
        const user = await User.findById(userId)
        if (!user?.voiceAccess) {
            throw new ApiError(501, "You are not allowed for voice creating, try contacting with admin", null)
        }
        console.log(user.generatedVoices)
        
        if (user.generatedVoices?.length >= user.allowedVoicesRequest) {
            throw new ApiError(501, "You have to reached to maximum created, for more contact to admin", null)
        }
        const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioBase64 = base64.encode(response.data);

        // Initialize Zyphra client
        const client = new ZyphraClient({ apiKey });

        // Generate voice
        const audioData = await client.audio.speech.create({
            text,
            speaker_audio: audioBase64,
            language_iso_code: 'en-us',
            mime_type: 'audio/mpeg',
            speaking_rate: 17,
            emotion: {
                happiness: 0.6,
        sadness: 0.1,
        disgust: 0.05,
        fear: 0.05,
        surprise: 0.2,
        other: 0.2,
        neutral: 0.8,
        anger: 0.1
            },
            pitch_std: 20,
            fmax: 6000,
            vqscore: 0.69,
        });

        


        // Convert Blob to ArrayBuffer, then to Buffer
        const arrayBuffer = await audioData.arrayBuffer(); // Converts Blob to ArrayBuffer
        const buffer = Buffer.from(arrayBuffer); // Converts ArrayBuffer to Buffer

        // Set response headers
        const fileName = 'output.mp3';
        resp.set({
            'Content-Disposition': `attachment; filename="${fileName}"`,
            'Content-Type': 'audio/mpeg',
        });

        const newVoice = {
            voiceText: text?.slice(0, 20), 
            audio: buffer.toString('base64') // Store as base64 to avoid binary issues
        };

        user.generatedVoices.push(newVoice)
        await user.save();

        // Send the audio data as a binary stream
        resp.status(201).send(buffer);

    } catch (error) {
        console.error('Error generating voice:', error.message);
        throw new ApiError(503, error.message, error)
    }
});

// const textToSpeech = asyncHandler(async (req, resp) => {
//     console.log(req.body);
//     const { text, speed, audioUrl } = req.body;
//     const apiKey = "zsk-3b77ee1c776147c116bb858cb39b1ced044599a635b0f7cea5080a5708644b82"

//     try {
//         // Fetch audio from the provided URL
//         const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
//         const audioBase64 = base64.encode(response.data);

//         // Initialize Zyphra client
//         const client = new ZyphraClient({ apiKey });

//         // Generate voice
//         const audioData = await client.audio.speech.create({
//             text,
//             speaker_audio: audioBase64,
//             language_iso_code: 'en-us',
//             mime_type: `audio/mp3`,
//             speaking_rate: 15,
           
//         });

//         // Send back the audio data as a file
//         const fileName = `output.mp3`;
//         resp.set({
//             'Content-Disposition': `attachment; filename="${fileName}"`,
//             'Content-Type': `audio/mp3`,
//         });
//         console.log(audioData)
//         return resp.status(201).json(
//             new ApiResponse(201, audioData, "Audio generated successfully")
//         )

//     } catch (error) {
//         console.log(error)
//         console.error('Error generating voice:', error.message);
//         resp.status(500).json({ error: 'Failed to generate voice' });
//     }

// });





export { voiceCloning, textToSpeech };
