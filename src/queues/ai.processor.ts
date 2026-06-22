import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { GiftsService } from '../modules/gifts/gifts.service';

@Processor('ai-queue')
export class AiProcessor {
  private readonly logger = new Logger(AiProcessor.name);
  private anthropic: Anthropic;

  constructor(
    private giftsService: GiftsService,
    private configService: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  @Process('generate-ai-tags')
  async handleGenerateAiTags(job: Job<{ giftId: string; name: string; description: string; category: string }>) {
    this.logger.log(`Generating AI tags for gift: ${job.data.giftId}`);

    try {
      const { giftId, name, description, category } = job.data;

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        temperature: 0.3,
        system: 'You are a gift tagging AI. Given a gift product, generate relevant tags for search and curation matching. Return ONLY a JSON array of 5-10 lowercase tags. No prose.',
        messages: [
          {
            role: 'user',
            content: `Product: ${name}\nCategory: ${category}\nDescription: ${description}\n\nGenerate search/curation tags as a JSON array.`,
          },
        ],
      });

      const textBlock = message.content.find((block) => block.type === 'text');
      const responseText = textBlock ? textBlock.text : '[]';

      let tags: string[] = [];
      try {
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
        }
        tags = JSON.parse(jsonStr);
      } catch {
        this.logger.warn(`Failed to parse AI tags for gift ${giftId}`);
        tags = [];
      }

      await this.giftsService.updateAiTags(giftId, tags);
      this.logger.log(`AI tags generated for gift ${giftId}: ${tags.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to generate AI tags for gift ${job.data.giftId}:`, error);
      throw error;
    }
  }
}
