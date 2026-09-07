import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.json({
        message: "Huddle backend server is running.",
    });
});

app.use("/api/auth", authRoutes);

export default app;