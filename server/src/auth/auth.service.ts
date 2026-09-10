import { 
    BadRequestException,
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import { supabase } from '../config/supabase';

@Injectable()
export class AuthService {
  async signUp(name: string, email: string, password: string) {
    if (!name || !email || !password) {
      throw new BadRequestException('Name, email, and password are required.');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must contain at least 8 characters.');
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
        error.message.toLowerCase().includes('user already registered') ||
        error.code === 'user_already_exists'
      ) {
        throw new ConflictException('An account with this email already exists.');
      }

      throw new BadRequestException(error.message);
    }

    return {
      message:
        'Registration successful. Please check your mail for verification link.',
      user: data.user,
      session: data.session,
    };
  }

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      message: 'Login successful.',
      user: data.user,
      session: data.session,
    };
  }

  async getCurrentUser(accessToken: string) {
    if (!accessToken) {
      throw new UnauthorizedException('Authorization token is required.');
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      throw new UnauthorizedException('Invalid or expired authorization token.');
    }

    return {
      message: 'User retrieved successfully.',
      user,
    };
  }
  
  async forgotPassword(email: string) {
    if (!email) {
      throw new BadRequestException('Email is required.');
    }

    const redirectTo = process.env.PASSWORD_RESET_REDIRECT_URL;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      ...(redirectTo ? { redirectTo } : {}),
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message:
        'If an account exists with this email, a password reset link has been sent.',
    };
  }

  async resetPassword(password: string, accessToken: string) {
    if (!password) {
      throw new BadRequestException('New password is required.');
    }

    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');
    }

    if (!accessToken) {
      throw new UnauthorizedException('Authorization token is required.');
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException('Invalid or expired authorization token.');
    }

    const { createClient } = await import('@supabase/supabase-js');

    const userSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );

    const { data, error } = await userSupabase.auth.updateUser({
      password,
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Password updated successfully.',
      user: data.user,
    };
  }

  async googleLogin() {
    const redirectTo = process.env.GOOGLE_AUTH_REDIRECT_URL;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: redirectTo ? { redirectTo } : {},
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Google authentication started',
      url: data.url,
    };
  }
}