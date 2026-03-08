import { randomUUID } from 'crypto';

const generateGuid = (): string => {
  return randomUUID();
};

export { generateGuid };
