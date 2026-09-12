import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import {
  createClient,
  SupabaseClient,
} from '@supabase/supabase-js';

import webpush from 'web-push';

@Injectable()
export class NotificationsService {
  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;

    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  getVapidPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY ?? '';
  }

  /**
   * Creates a Supabase client that acts on behalf
   * of the currently authenticated user.
   */
  private getAuthenticatedClient(
    accessToken: string,
  ): SupabaseClient {
    if (!accessToken) {
      throw new UnauthorizedException(
        'Authorization token is required.',
      );
    }

    return createClient(
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
  }

  async saveSubscription(
    accessToken: string,
    subscription: any,
  ) {
    if (!subscription?.endpoint) {
      throw new BadRequestException(
        'A push subscription is required.',
      );
    }

    const supabase =
      this.getAuthenticatedClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          subscription,
        },
        {
          onConflict: 'user_id,subscription',
          ignoreDuplicates: true,
        },
      );

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Push notifications enabled.',
    };
  }

  async deleteSubscription(
    accessToken: string,
    endpoint: string,
  ) {
    if (!endpoint) {
      throw new BadRequestException(
        'A subscription endpoint is required.',
      );
    }

    const supabase =
      this.getAuthenticatedClient(accessToken);

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('subscription->>endpoint', endpoint);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      message: 'Push notifications disabled.',
    };
  }

  /**
   * Sends a web push to every member of a channel except `excludeUserId`
   * (the sender or the person who just joined). Fire-and-forget by the
   * callers, so a failed push never breaks a message send or join.
   */
  async sendToChannel(
    accessToken: string,
    channelId: string,
    payload: { title: string; body: string; url: string },
    excludeUserId: string,
  ): Promise<void> {
    if (
      !process.env.VAPID_PUBLIC_KEY ||
      !process.env.VAPID_PRIVATE_KEY
    ) {
      // Web push isn't configured — nothing to do.
      return;
    }

    const supabase =
      this.getAuthenticatedClient(accessToken);

    const { data, error } = await supabase.rpc(
      'channel_member_push_subscriptions',
      {
        p_channel_id: channelId,
        p_exclude_user_id: excludeUserId,
      },
    );

    if (error) {
      console.warn('Push lookup failed:', error.message);
      return;
    }

    const subscriptions =
      (data ?? []) as Array<{ subscription: any }>;

    for (const row of subscriptions) {
      const subscription = row?.subscription;

      if (!subscription?.endpoint) {
        continue;
      }

      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify(payload),
        );
      } catch (err: any) {
        // 404/410 means the subscription is stale or revoked. Skip it — the
        // next time the user opens the app they'll re-subscribe. We do NOT
        // delete it here: removing another user's row would require bypassing
        // Row Level Security.
        console.warn(
          'Push send failed:',
          err?.statusCode ?? err?.message,
        );
      }
    }
  }
}
