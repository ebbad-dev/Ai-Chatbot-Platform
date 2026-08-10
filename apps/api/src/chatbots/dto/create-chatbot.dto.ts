import { IsString, IsUrl, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateChatbotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsUrl({ require_tld: false }) // Allow localhost for development
  @IsNotEmpty()
  @MaxLength(512)
  websiteOrigin: string;

  @IsString()
  @IsNotEmpty()
  welcomeMessage: string;

  @IsString()
  @IsNotEmpty()
  fallbackMessage: string;
}
