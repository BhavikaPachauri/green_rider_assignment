import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { listUsers } from "../controllers/user.controller.js";
const router = express.Router();
router.use(authMiddleware);
router.get("/", listUsers);
export default router;
