export interface CreateMeetingParams {
  bookingId: string;
  startAt: Date;
  endAt: Date;
  mentorEmail: string;
  studentEmail: string;
}

export interface VideoMeeting {
  joinUrl: string;
  providerMeetingId: string;
}

export interface VideoCallProvider {
  createMeeting(params: CreateMeetingParams): Promise<VideoMeeting>;
}

export const VIDEO_CALL_PROVIDER = Symbol('VIDEO_CALL_PROVIDER');
