// import { Router } from "express";
// import { getAllUsers } from "../controllers/admin.controller.js";

// const router = Router()

// // Get All Users
// router.route("/all_users").get(getAllUsers)


// export default router


import { Router } from 'express';
import { adminRouter } from '../../admin.js';  // Import the AdminJS router from admin.js

const router = Router();

router.use(adminRouter);

export default router;
