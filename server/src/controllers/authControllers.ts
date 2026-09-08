import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export async function signUp(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must contain at least 8 characters." });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      if (
        error.message.toLowerCase().includes("user already registered") ||
        error.code === "user_already_exists"
      ) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists." });
      }

      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message:
        "Registration successful. Please check your mail for verification link.",
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Registration failed something went wrong.",
    });
  }
}

export async function logIn(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ message: error.message });
    }

    return res.status(200).json({
      message: "Login successful.",
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong during login.",
    });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const redirectTo = process.env.PASSWORD_RESET_REDIRECT_URL;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      ...(redirectTo ? { redirectTo } : {}),
    });

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(200).json({
      message:
        "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Something went wrong",
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(200).json({
      message: "Password updated successfully",
      user: data.user,
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Something went wrong while resetting your password",
    });
  }
}

export async function googleLogin(_req: Request, res: Response) {
  try {
    const redirectTo = process.env.GOOGLE_AUTH_REDIRECT_URL;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: redirectTo ? { redirectTo } : {},
    });

    if (error) {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(200).json({
      message: "Google authentication started",
      url: data.url,
    });
  } catch (error) {
    console.error("Google authentication error:", error);

    return res.status(500).json({
      message: "Something went wrong while starting Google authentication",
    });
  }
}
