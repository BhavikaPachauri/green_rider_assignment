import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  login,
  logout,
  me,
  refresh,
  register,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authMiddleware, me);

export default router;
