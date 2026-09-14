import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { AuthRequest, authMiddleware } from '../middleware/auth.js';
import { sendPushNotification, sendToTopic } from '../services/firebase.js';

const router = Router();
router.use(authMiddleware);

const sendSchema = z.object({
  token: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string()).optional(),
});

router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const body = sendSchema.parse(req.body);
    const result = await sendPushNotification(body.token, body.title, body.body, body.data);
    res.json({ success: !!result, messageId: result });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/order-update', async (req: AuthRequest, res: Response) => {
  const { orderId, status, customerPhone } = req.body;

  const statusMessages: Record<string, string> = {
    preparing: 'Your order is being prepared!',
    ready: 'Your order is ready for pickup!',
    served: 'Your order has been served. Enjoy!',
    completed: 'Thank you for your order!',
  };

  const message = statusMessages[status];
  if (!message) {
    return res.json({ skipped: true });
  }

  // In a real app, you'd look up the customer's FCM token
  // For now, just log the notification
  console.log(`Order ${orderId} notification to ${customerPhone}: ${message}`);

  // Send to location topic for kitchen/dashboard updates
  const locationId = req.user?.location_ids?.[0];
  if (locationId) {
    await sendToTopic(`location:${locationId}`, `Order #${orderId.slice(0, 8)}`, message);
  }

  res.json({ success: true, message });
});

export default router;
