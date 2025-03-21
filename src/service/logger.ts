import { kysely } from '@/database';

type LogActivityOptions = {
  businessId: number;
  userId: number;
  action: string;
  status: 'success' | 'failed';
  message?: string;
  context?: Record<any, any>;
};

export async function logActivity(
  options: LogActivityOptions,
) {
  return await kysely
    .insertInto('ActivityLog')
    .values({
      businessId: options.businessId,
      userId: options.userId,
      action: options.action,
      status: options.status,
      message: options.message,
      context: options.context,
      createdAt: new Date(),
    })
    .returning(['id'])
    .executeTakeFirstOrThrow();
}
