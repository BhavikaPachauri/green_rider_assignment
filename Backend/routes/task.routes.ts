import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  toggleTask,
} from "../controllers/task.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getTasks);
router.post("/", createTask);
router.get("/:id", getTaskById);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
router.patch("/:id/toggle", toggleTask);

export default router;
