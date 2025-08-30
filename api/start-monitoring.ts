import { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Cron Job 설정용 엔드포인트
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 이벤트 모니터링 API 호출
    const monitorResponse = await fetch(`${process.env.VERCEL_URL}/api/event-monitor`, {
      method: 'GET'
    });

    const result = await monitorResponse.json();

    res.status(200).json({
      message: 'Event monitoring cycle completed',
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Monitoring cycle failed:', error);
    res.status(500).json({ error: 'Monitoring failed' });
  }
}