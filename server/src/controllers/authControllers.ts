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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(201).json({
      message: "Registration successful.",
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    return res.status(500).json({ 
     message: "Internal server error.",
    });
  }
}

export async function logIn(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if ( !email || !password) {
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
    return res.status(500).json({ 
     message: "Something went wrong.",
    });
  }
}
