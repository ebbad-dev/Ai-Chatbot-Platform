import { IsString, MaxLength, IsNotEmpty, Matches } from 'class-validator';

export class CreateAllowedDomainDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  // Simple regex to validate domain format, allowing localhost as well
  @Matches(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}|localhost(:\d+)?$/, {
    message: 'domain must be a valid domain name or localhost',
  })
  domain: string;
}
