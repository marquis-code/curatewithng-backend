import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GiftsService } from '../modules/gifts/gifts.service';

@Processor('ai-queue')
export class AiProcessor {
  private readonly logger = new Logger(AiProcessor.name);
  private openai: OpenAI;

  constructor(
    private giftsService: GiftsService,
    private configService: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  @Process('generate-ai-tags')
  async handleGenerateAiTags(job: Job<{ giftId: string; name: string; description: string; category: string }>) {
    this.logger.log(`Generating AI tags for gift: ${job.data.giftId}`);

    try {
      const { giftId, name, description, category } = job.data;

      const completion = await this.openai.chat.completions.create({
        model: 'openai/gpt-oss-20b',
        max_completion_tokens: 300,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: `You are a gift tagging AI. Given a gift product, generate relevant tags for search and curation matching. Return ONLY a JSON array of 5-10 lowercase tags. No prose.\n\nProduct: ${name}\nCategory: ${category}\nDescription: ${description}\n\nGenerate search/curation tags as a JSON array.`,
          },
        ],
        reasoning_effort: 'low',
      });

      const responseText = completion.choices[0]?.message?.content || '[]';

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
