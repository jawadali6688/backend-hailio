import dotenv from "dotenv";
import connectDB from "./src/db/databaseConnection.js";
import { app } from "./app.js";

dotenv.config();

// Connect to the database
connectDB()
  .then(() => {
    // Start the server after successful database connection
    app.listen(process.env.PORT, () => {
      console.log(" APP IS RUNNING ON:", process.env.PORT );
    });
  })

  .catch((error) => {
    // If any error to the database connection
    console.error("ERROR WHILE CONNECTING TO THE DATABASE:", error);
  });