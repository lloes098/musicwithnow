import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    message: 'Monad Music Collaboration API is working!',
    timestamp: new Date().toISOString(),
    method: req.method
  });
}