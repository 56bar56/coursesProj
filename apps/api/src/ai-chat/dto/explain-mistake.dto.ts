import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

export const MAX_CHAT_MESSAGES = 20;

export class ChatTurnDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}

/**
 * The conversation lives on the client and is resent each turn (stateless,
 * no DB table). An empty `messages` array asks for the initial explanation.
 * Only 'user'/'assistant' roles are accepted — the system prompt is always
 * built server-side, so a client can't smuggle in its own instructions.
 */
export class ExplainMistakeDto {
  @IsArray()
  @ArrayMaxSize(MAX_CHAT_MESSAGES)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  messages!: ChatTurnDto[];

  @IsOptional()
  @IsIn(['en', 'he'])
  locale?: 'en' | 'he';
}
