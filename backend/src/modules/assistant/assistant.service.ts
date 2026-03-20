import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatAssistantRequestDto, ChatHistoryTurnDto } from './dto/chat-assistant-request.dto';
import { ChatAssistantResponseDto, MenuSuggestionDto } from './dto/chat-assistant-response.dto';
import { GroqProvider } from './groq.provider';

const MAX_STORED_HISTORY = 20;
const MAX_MENU_SUGGESTIONS = 5;
const FALLBACK_REPLY = 'I can help with menu info, order types, pickup/delivery, and payment guidance. Tell me what you are craving and I will suggest items from QuickBite.';

type NormalizedHistoryTurn = {
  role: 'user' | 'assistant';
  content: string;
};

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly groqProvider: GroqProvider,
  ) {}

  async chat(userId: string, dto: ChatAssistantRequestDto): Promise<ChatAssistantResponseDto> {
    const message = this.normalizeText(dto.message, 500);
    if (!message) {
      throw new BadRequestException('Message must not be empty');
    }

    const history = this.normalizeHistory(dto.history ?? []);
    const menuSuggestions = await this.findMenuSuggestions(message);
    const prompt = this.buildPrompt({
      userId,
      pageContext: dto.pageContext ?? 'menu',
      message,
      history,
      menuSuggestions,
    });

    const quickReplies = this.buildQuickReplies(menuSuggestions);

    try {
      const reply = await this.groqProvider.generateReply(prompt);
      if (!reply) {
        this.logger.warn('Assistant fallback response used: provider returned empty reply');
        return {
          reply: FALLBACK_REPLY,
          menuSuggestions,
          quickReplies,
        };
      }

      return {
        reply,
        menuSuggestions,
        quickReplies,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Assistant fallback response used: ${reason}`);
      return {
        reply: FALLBACK_REPLY,
        menuSuggestions,
        quickReplies,
      };
    }
  }

  private normalizeText(text: string, maxLen: number): string {
    return (text ?? '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen);
  }

  private normalizeHistory(history: ChatHistoryTurnDto[]): NormalizedHistoryTurn[] {
    return history
      .slice(-MAX_STORED_HISTORY)
      .map((turn) => {
        const role: NormalizedHistoryTurn['role'] = turn.role === 'assistant' ? 'assistant' : 'user';
        return {
          role,
          content: this.normalizeText(turn.content, 1000),
        };
      })
      .filter((turn) => turn.content.length > 0);
  }

  private extractKeywords(message: string): string[] {
    return message
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3)
      .slice(0, 6);
  }

  private async findMenuSuggestions(message: string): Promise<MenuSuggestionDto[]> {
    const keywords = this.extractKeywords(message);

    const baseWhere = {
      deletedAt: null as null,
      isAvailable: true,
      is86d: false,
    };

    const orQuery = keywords.flatMap((keyword) => [
      { name: { contains: keyword, mode: 'insensitive' as const } },
      { description: { contains: keyword, mode: 'insensitive' as const } },
      { category: { name: { contains: keyword, mode: 'insensitive' as const } } },
    ]);

    let matches = await this.prisma.menuItem.findMany({
      where: {
        ...baseWhere,
        ...(orQuery.length > 0 ? { OR: orQuery } : {}),
      },
      select: {
        id: true,
        name: true,
        price: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
      take: MAX_MENU_SUGGESTIONS,
    });

    if (matches.length === 0) {
      matches = await this.prisma.menuItem.findMany({
        where: baseWhere,
        select: {
          id: true,
          name: true,
          price: true,
          category: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
        take: MAX_MENU_SUGGESTIONS,
      });
    }

    return matches.map((item) => ({
      id: item.id,
      name: item.name,
      price: Number(item.price).toFixed(2),
      category: item.category.name,
    }));
  }

  private buildQuickReplies(menuSuggestions: MenuSuggestionDto[]): string[] {
    const replies = [
      'How does pickup work?',
      'What are your popular items?',
      'Can I get delivery right now?',
    ];

    if (menuSuggestions.length > 0) {
      replies.unshift(`Show me something like ${menuSuggestions[0].name}`);
    }

    return replies.slice(0, 3);
  }

  private buildPrompt(input: {
    userId: string;
    pageContext: 'menu';
    message: string;
    history: NormalizedHistoryTurn[];
    menuSuggestions: MenuSuggestionDto[];
  }): string {
    const historyText = input.history.length > 0
      ? input.history.map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`).join('\n')
      : 'No prior conversation.';

    const menuText = input.menuSuggestions.length > 0
      ? input.menuSuggestions
          .map((item) => `- ${item.name} ($${item.price}) [${item.category}]`)
          .join('\n')
      : '- No close menu matches found.';

    return `
Context:
- User ID: ${input.userId}
- Page Context: ${input.pageContext}
- QuickBite order types: FINE_DINE, PICKUP, DELIVERY.
- Delivery orders require card payment.
- Assistant is suggest-only and must not claim to place orders.

Recent Conversation:
${historyText}

Current User Message:
${input.message}

Candidate Menu Matches:
${menuText}

Task:
1) Answer the user clearly and briefly.
2) If helpful, mention 1-3 menu items from Candidate Menu Matches.
3) Keep tone warm and practical.
4) If user asks to place an order, guide them to add items from the menu/cart flow.
`.trim();
  }
}
