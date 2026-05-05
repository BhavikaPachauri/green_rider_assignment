import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  createTask,
  deleteTask,
  getTaskById,
  listTasks,
  updateTask,
} from "../controllers/task.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", listTasks);
router.post("/", createTask);
router.get("/:id", getTaskById);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;
