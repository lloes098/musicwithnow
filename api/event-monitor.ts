import { VercelRequest, VercelResponse } from '@vercel/node';
import { ethers } from 'ethers';

const MONAD_RPC_URL = 'https://testnet-rpc.monad.network';
const MUSIC_HUB_ADDRESS = process.env.MUSIC_HUB_ADDRESS!;

const MUSIC_HUB_ABI = [
  "event AIProcessingRequested(uint256 indexed projectId, string s3Url, address requester)"
];

let lastProcessedBlock = 0;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(MONAD_RPC_URL);
    const contract = new ethers.Contract(MUSIC_HUB_ADDRESS, MUSIC_HUB_ABI, provider);

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = lastProcessedBlock || currentBlock - 100;

    // 새 이벤트 조회
    const events = await contract.queryFilter(
      contract.filters.AIProcessingRequested(),
      fromBlock,
      currentBlock
    );

    const processedEvents = [];

    // 각 이벤트를 AI 처리 요청으로 변환
    for (const event of events) {
      const { projectId, s3Url, requester } = event.args;
      
      // 웹훅 API 호출하여 AI 처리 시작
      try {
        const webhookResponse = await fetch(`${process.env.VERCEL_URL}/api/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: projectId.toString(),
            contributionUrls: [s3Url], // 단일 URL을 배열로 변환
            requester
          })
        });

        if (webhookResponse.ok) {
          processedEvents.push({
            projectId: projectId.toString(),
            s3Url,
            requester,
            blockNumber: event.blockNumber,
            status: 'processing'
          });
        }
      } catch (error) {
        console.error(`Failed to process event for project ${projectId}:`, error);
      }
    }

    lastProcessedBlock = currentBlock;

    res.status(200).json({
      processedEvents,
      fromBlock,
      toBlock: currentBlock,
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Event monitoring failed:', error);
    res.status(500).json({ error: 'Failed to monitor events' });
  }
}