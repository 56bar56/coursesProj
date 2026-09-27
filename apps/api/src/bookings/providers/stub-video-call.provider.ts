import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema';
import type { CreateMeetingParams, VideoCallProvider, VideoMeeting } from './video-call-provider.interface';

/**
 * Placeholder video meeting, since no real Zoom/Google Meet account exists
 * yet. Swapping to a real provider later means implementing this interface
 * again, not changing anything that calls it.
 */
@Injectable()
export class StubVideoCallProvider implements VideoCallProvider {
  constructor(private readonly config: ConfigService<Env, true>) {}

  async createMeeting(params: CreateMeetingParams): Promise<VideoMeeting> {
    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    return {
      joinUrl: `${frontendUrl}/call/stub/${params.bookingId}`,
      providerMeetingId: `stub_${params.bookingId}`,
    };
  }
}
