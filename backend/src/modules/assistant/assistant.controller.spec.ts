import { Role } from '@prisma/client';
import { AssistantController } from './assistant.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorators';

describe('AssistantController', () => {
  it('chat endpoint is restricted to CUSTOMER role', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AssistantController.prototype.chat);
    expect(roles).toEqual([Role.CUSTOMER]);
  });
});

