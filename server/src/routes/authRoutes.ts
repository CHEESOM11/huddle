import { Router } from "express";
import{
    signUp,
    logIn,
    forgotPassword,
    resetPassword,
    googleLogin,
} from "../controllers/authControllers";

const router = Router();

router.post("/signup", signUp);
router.post("/login", logIn);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/google", googleLogin);
export default router;