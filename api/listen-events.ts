import { VercelRequest, VercelResponse } from '@vercel/node';
import { ethers } from 'ethers';

const MONAD_RPC_URL = 'https://testnet-rpc.monad.network';
const MUSIC_HUB_ADDRESS = process.env.MUSIC_HUB_ADDRESS!;

const MUSIC_HUB_ABI = [
  "event AIProcessingRequested(uint256 indexed projectId, string s3Url, address requester)"
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(MONAD_RPC_URL);
    const contract = new ethers.Contract(MUSIC_HUB_ADDRESS, MUSIC_HUB_ABI, provider);

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 1000; // 최근 1000블록 검색

    const events = await contract.queryFilter(
      contract.filters.AIProcessingRequested(),
      fromBlock,
      currentBlock
    );

    const processedEvents = events.map(event => ({
      projectId: event.args?.projectId.toString(),
      s3Url: event.args?.s3Url,
      requester: event.args?.requester,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash
    }));

    res.status(200).json({ 
      events: processedEvents,
      fromBlock,
      toBlock: currentBlock
    });

  } catch (error) {
    console.error('Event listening failed:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
}