import { BadRequestException } from '@nestjs/common';
import { AssistantService } from './assistant.service';

describe('AssistantService', () => {
  const mockPrisma = {
    menuItem: {
      findMany: jest.fn(),
    },
  };

  const mockGemini = {
    generateReply: jest.fn(),
  };

  const service = new AssistantService(mockPrisma as any, mockGemini as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns reply and menu suggestions for normal prompt', async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([
      {
        id: 'item-1',
        name: 'Zinger Burger',
        price: 9.5,
        category: { name: 'Burgers' },
      },
    ]);
    mockGemini.generateReply.mockResolvedValue('Try the Zinger Burger for a spicy option.');

    const result = await service.chat('user-1', {
      message: 'suggest me a spicy burger',
      history: [],
      pageContext: 'menu',
    });

    expect(result.reply).toContain('Zinger Burger');
    expect(result.menuSuggestions).toHaveLength(1);
    expect(result.menuSuggestions[0]).toEqual({
      id: 'item-1',
      name: 'Zinger Burger',
      price: '9.50',
      category: 'Burgers',
    });
  });

  it('queries only available and non-deleted menu items', async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([]);
    mockGemini.generateReply.mockResolvedValue('No exact match found.');

    await service.chat('user-2', {
      message: 'pizza',
      history: [],
      pageContext: 'menu',
    });

    expect(mockPrisma.menuItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          isAvailable: true,
          is86d: false,
        }),
      }),
    );
  });

  it('throws BadRequestException for empty message', async () => {
    await expect(
      service.chat('user-3', {
        message: '    ',
        history: [],
        pageContext: 'menu',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('falls back safely when Gemini fails', async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([]);
    mockGemini.generateReply.mockRejectedValue(new Error('provider timeout'));

    const result = await service.chat('user-4', {
      message: 'help me choose',
      history: [],
      pageContext: 'menu',
    });

    expect(result.reply).toContain('I can help with menu info');
    expect(result.quickReplies.length).toBeGreaterThan(0);
  });
});

