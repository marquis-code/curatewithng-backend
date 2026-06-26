import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CurationSession, CurationSessionDocument } from './schemas/curation-session.schema';
import { GenerateCurationDto } from './dto/generate-curation.dto';
import { GiftsService } from '../gifts/gifts.service';
import { RedisCacheService } from '../../shared/cache/cache.service';
import { PaginationDto, createPaginatedResponse } from '../../shared/pagination/pagination.dto';

@Injectable()
export class AiCuratorService {
  private readonly logger = new Logger(AiCuratorService.name);
  private openai: OpenAI;

  constructor(
    @InjectModel(CurationSession.name) private sessionModel: Model<CurationSessionDocument>,
    private giftsService: GiftsService,
    private configService: ConfigService,
    private cacheService: RedisCacheService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('GROQ_API_KEY'),
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  async generate(dto: GenerateCurationDto, userId?: string) {
    // 1. Rate limit check for anonymous users
    if (!userId) {
      const ip = 'anonymous'; // In production, extract from request
      const rateKey = `rate-limit:${ip}:ai-curator`;
      const count = await this.cacheService.increment(rateKey, 3600);
      if (count > 10) {
        throw new BadRequestException('Rate limit exceeded. Please sign in for unlimited curation.');
      }
    }

    // 2. Fetch product pool
    const productPool = await this.giftsService.getProductPool(
      dto.occasion,
      dto.budgetMin,
      dto.budgetMax,
    );



    // 3. Build Groq prompt
    const systemPrompt = `You are GiftGenius, an expert Nigerian gift curator. Your role is to recommend the most thoughtful and appropriate gifts for a specific recipient. You understand Nigerian culture, gifting occasions like Owambe, weddings, and corporate events, and you prioritise gifts that feel personal and meaningful.
You can choose to recommend physical gifts from the provided catalogue, OR you can invent completely new, abstract custom gift ideas if the catalogue doesn't have the perfect match.
Always respond with a valid JSON object. It MUST contain a "recommendations" array. No prose, no markdown.`;

    const productList = productPool.map((p) => ({
      giftId: p._id.toString(),
      name: p.name,
      category: p.category,
      price: p.price / 100, // Convert kobo to Naira for the AI
      tags: p.tags,
      occasions: p.occasions,
      recipientTypes: p.recipientTypes,
      description: p.description,
    }));

    const userPrompt = `I need to buy a gift for my ${dto.relationship}${dto.recipientName ? `, ${dto.recipientName}` : ''}.
About them: ${dto.age ? `${dto.age} years old, ` : ''}${dto.gender || 'not specified'}, interested in ${dto.interests.join(', ')}.
Occasion: ${dto.occasion}. Budget: ₦${(dto.budgetMin / 100).toLocaleString()} – ₦${(dto.budgetMax / 100).toLocaleString()}.
${dto.additionalNotes ? `Additional context: ${dto.additionalNotes}.` : ''}

Here are the available physical gifts in our catalogue:
${JSON.stringify(productList)}

Return a JSON object containing a "recommendations" array of up to 8 gift recommendations ranked by suitability.
For catalog gifts, the object in the array MUST have: "giftId" (string), "score" (number 0-100), "reasoning" (string, max 30 words), "isCustom": false.
For custom abstract ideas, the object in the array MUST have: "customName" (string), "customDescription" (string), "estimatedPrice" (number, in Naira), "score" (number), "reasoning" (string), "isCustom": true.`;

    // 4. Call Groq API
    let aiResponseText = '';
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Updated to currently supported 70b versatile model
        max_completion_tokens: 1500,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      });

      aiResponseText = completion.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.error('Groq API error:', error);
      throw new BadRequestException('AI curation service temporarily unavailable. Please try again.');
    }

    // 5. Parse AI response
    let recommendations: Array<{
      giftId?: string;
      isCustom?: boolean;
      customName?: string;
      customDescription?: string;
      estimatedPrice?: number;
      score: number;
      reasoning: string;
    }> = [];
    try {
      // Extract JSON from response (handle potential markdown wrapping)
      let jsonStr = aiResponseText.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
      }
      const parsed = JSON.parse(jsonStr);
      recommendations = parsed.recommendations || [];
      if (!Array.isArray(recommendations)) {
        recommendations = [];
      }
    } catch {
      this.logger.error('Failed to parse Groq response:', aiResponseText);
      // Fallback: return products sorted by relevance
      recommendations = productPool.slice(0, 8).map((p, i) => ({
        giftId: p._id.toString(),
        score: 90 - i * 5,
        reasoning: 'Matches your criteria based on occasion and budget.',
        isCustom: false
      }));
    }

    // 6. Re-fetch full product documents
    const giftIds = recommendations.filter((r) => !r.isCustom && r.giftId).map((r) => r.giftId!);
    const fullProducts = await Promise.all(
      giftIds.map(async (id) => {
        try {
          return await this.giftsService.findById(id);
        } catch {
          return null;
        }
      }),
    );

    // 7. Merge reasoning and score into products
    const enrichedRecommendations = recommendations
      .map((rec) => {
        if (rec.isCustom) {
          return {
            isCustom: true,
            customGift: {
              name: rec.customName,
              description: rec.customDescription,
              price: (rec.estimatedPrice || 0) * 100, // convert back to kobo for frontend consistency
              currency: 'NGN',
            },
            score: rec.score,
            reasoning: rec.reasoning,
          };
        }

        const product = fullProducts.find((p) => p && p._id.toString() === rec.giftId);
        if (!product) return null;
        return {
          isCustom: false,
          gift: product,
          score: rec.score,
          reasoning: rec.reasoning,
        };
      })
      .filter(Boolean);

    // 8. Save session
    const session = new this.sessionModel({
      userId: userId ? new Types.ObjectId(userId) : undefined,
      recipientProfile: {
        name: dto.recipientName,
        relationship: dto.relationship,
        age: dto.age,
        gender: dto.gender,
        interests: dto.interests,
        occasion: dto.occasion,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
      },
      aiPrompt: userPrompt,
      aiResponse: aiResponseText,
      recommendations: recommendations.map((r) => {
        const mapped: any = {
          score: r.score,
          reasoning: r.reasoning,
          isCustom: r.isCustom || false,
        };
        if (r.isCustom) {
          mapped.customName = r.customName;
          mapped.customDescription = r.customDescription;
          mapped.estimatedPrice = r.estimatedPrice;
        } else if (r.giftId) {
          mapped.giftId = new Types.ObjectId(r.giftId);
        }
        return mapped;
      }),
    });
    await session.save();

    // 9. Return
    return {
      sessionId: session._id,
      recommendations: enrichedRecommendations,
    };
  }

  async getUserSessions(userId: string, query: PaginationDto) {
    const { page, limit } = query;
    const filter = { userId: new Types.ObjectId(userId) };

    const [data, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('recommendations.giftId', 'name slug images price'),
      this.sessionModel.countDocuments(filter),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getSession(id: string) {
    const session = await this.sessionModel
      .findById(id)
      .populate('recommendations.giftId', 'name slug images price description category');
    if (!session) throw new BadRequestException('Session not found');
    return session;
  }

  async getAllSessions(query: PaginationDto) {
    const { page, limit } = query;
    const [data, total] = await Promise.all([
      this.sessionModel
        .find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('userId', 'firstName lastName email'),
      this.sessionModel.countDocuments(),
    ]);
    return createPaginatedResponse(data, total, page, limit);
  }

  async getConversionStats() {
    const [total, converted] = await Promise.all([
      this.sessionModel.countDocuments(),
      this.sessionModel.countDocuments({ isConverted: true }),
    ]);
    return {
      total,
      converted,
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(2) : '0',
    };
  }

  async markConverted(sessionId: string) {
    await this.sessionModel.findByIdAndUpdate(sessionId, { isConverted: true });
  }
}
