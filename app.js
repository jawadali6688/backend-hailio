import express from "express"
import cors from "cors";
import authRouter from "./src/routes/auth.route.js"
import voiceRouter from "./src/routes/voice.route.js"
import adminRouter from "./src/routes/admin.route.js"
import { ApiError } from "./src/utils/apiError.js";
import axios from "axios";
const app = express()



app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174",  "https://hailio-ai.vercel.app"],
    credentials: true,
  }));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true, limit: "416kb" }));
app.use(express.json())


// Routers
app.use('/api/v1/auth', authRouter)
app.use("/api/v1/voice", voiceRouter)
app.use("/api/v1/admin", adminRouter)

// health route
app.get('/health', (req, res) => {
    res.status(200).send('Service is live, Enjoy Jawad 🎉');
  });

// For api error middleware
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors, // Additional error details, if any
    });
  }

  // Generic error handling for unexpected errors
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});




export { app }