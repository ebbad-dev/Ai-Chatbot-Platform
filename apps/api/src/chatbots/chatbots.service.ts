import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chatbot } from './entities/chatbot.entity';
import { AllowedDomain } from './entities/allowed-domain.entity';
import { CreateChatbotDto } from './dto/create-chatbot.dto';
import { UpdateChatbotDto } from './dto/update-chatbot.dto';
import { CreateAllowedDomainDto } from './dto/create-allowed-domain.dto';
import { AppConfigService } from '../config/app-config.service';
import * as crypto from 'crypto';

@Injectable()
export class ChatbotsService {
  constructor(
    @InjectRepository(Chatbot)
    private readonly chatbotRepository: Repository<Chatbot>,
    @InjectRepository(AllowedDomain)
    private readonly allowedDomainRepository: Repository<AllowedDomain>,
    private readonly configService: AppConfigService,
  ) {}

  public normalizeOrigin(origin: string): string {
    try {
      // Must include scheme for URL constructor
      const url = new URL(origin.includes('://') ? origin : `https://${origin}`);
      
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new BadRequestException('Only HTTP and HTTPS protocols are allowed');
      }

      const hostname = url.hostname.toLowerCase();
      
      if (hostname === 'localhost' && !this.configService.isDevelopment) {
        throw new BadRequestException('Localhost is only allowed in development environment');
      }

      // Reconstruct origin
      return `${url.protocol}//${hostname}${url.port ? ':' + url.port : ''}`;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Invalid origin format');
    }
  }

  private generatePublicKey(): string {
    return `bot_pub_${crypto.randomBytes(32).toString('hex')}`;
  }

  async create(createChatbotDto: CreateChatbotDto): Promise<Chatbot> {
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const publicKey = this.generatePublicKey();
        const chatbot = this.chatbotRepository.create({
          ...createChatbotDto,
          publicKey,
        });
        return await this.chatbotRepository.save(chatbot);
      } catch (error: unknown) {
        // 23505 is PostgreSQL unique violation error code
        if (
          error !== null &&
          typeof error === 'object' &&
          'code' in error &&
          error.code === '23505' &&
          'detail' in error &&
          typeof error.detail === 'string' &&
          error.detail.includes('public_key')
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('Failed to generate a unique public key after multiple attempts');
  }

  async findAll(): Promise<Chatbot[]> {
    return this.chatbotRepository.find();
  }

  async findOne(id: string): Promise<Chatbot> {
    const chatbot = await this.chatbotRepository.findOne({
      where: { id },
      relations: ['allowedDomains'],
    });
    if (!chatbot) {
      throw new NotFoundException(`Chatbot with ID ${id} not found`);
    }
    return chatbot;
  }

  async findByPublicKey(publicKey: string): Promise<Chatbot> {
    const chatbot = await this.chatbotRepository.findOne({
      where: { publicKey },
      relations: ['allowedDomains'],
    });
    if (!chatbot) {
      throw new NotFoundException(`Chatbot not found`);
    }
    return chatbot;
  }

  async update(id: string, updateChatbotDto: UpdateChatbotDto): Promise<Chatbot> {
    const chatbot = await this.findOne(id);
    this.chatbotRepository.merge(chatbot, updateChatbotDto);
    return this.chatbotRepository.save(chatbot);
  }

  async remove(id: string): Promise<void> {
    const chatbot = await this.findOne(id);
    await this.chatbotRepository.remove(chatbot);
  }

  // --- Allowed Domains Logic ---

  async addAllowedDomain(
    chatbotId: string,
    createAllowedDomainDto: CreateAllowedDomainDto,
  ): Promise<AllowedDomain> {
    const chatbot = await this.findOne(chatbotId);
    const normalizedDomain = this.normalizeOrigin(createAllowedDomainDto.domain);
    
    // Check if domain already exists for this chatbot
    const existing = await this.allowedDomainRepository.findOne({
      where: { chatbot: { id: chatbotId }, domain: normalizedDomain },
    });
    
    if (existing) {
      throw new ConflictException('Domain is already allowed for this chatbot');
    }

    const domain = this.allowedDomainRepository.create({
      ...createAllowedDomainDto,
      domain: normalizedDomain,
      chatbot,
    });
    return this.allowedDomainRepository.save(domain);
  }

  async removeAllowedDomain(chatbotId: string, domainId: string): Promise<void> {
    const domain = await this.allowedDomainRepository.findOne({
      where: { id: domainId, chatbot: { id: chatbotId } },
    });
    if (!domain) {
      throw new NotFoundException(`Allowed domain not found`);
    }
    await this.allowedDomainRepository.remove(domain);
  }
}
