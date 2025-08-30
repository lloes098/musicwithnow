import { VercelRequest, VercelResponse } from '@vercel/node';
import { ethers } from 'ethers';
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const MONAD_RPC_URL = 'https://testnet-rpc.monad.network';
const MUSIC_HUB_ADDRESS = process.env.MUSIC_HUB_ADDRESS!;

const MUSIC_HUB_ABI = [
  "function completeAIProcessing(uint256 projectId, string memory resultS3Url, address sepoliaReceiver) external"
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, contributionUrls, requester } = req.body;

    console.log(`Processing AI remix for Project ${projectId}:`, { contributionUrls, requester });

    const audioBuffers = await Promise.all(
      contributionUrls.map((url: string) => downloadFromS3(url))
    );
    
    const remixedAudio = await remixMusic(audioBuffers, projectId);
    
    const resultS3Url = await uploadToS3(
      remixedAudio, 
      `remix-project-${projectId}-v${Date.now()}.mp3`
    );
    
    await completeAIProcessing(projectId, resultS3Url);
    
    console.log(`Project ${projectId} completed. Result: ${resultS3Url}`);
    
    res.status(200).json({ 
      success: true, 
      projectId,
      resultS3Url 
    });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
}

async function downloadFromS3(s3Url: string): Promise<Buffer> {
  const urlParts = s3Url.split('/');
  const bucket = urlParts[2].split('.')[0];
  const key = urlParts.slice(3).join('/');

  const params = { Bucket: bucket, Key: key };
  const data = await s3.getObject(params).promise();
  return data.Body as Buffer;
}

async function uploadToS3(buffer: Buffer, fileName: string): Promise<string> {
  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: `processed/${fileName}`,
    Body: buffer,
    ContentType: 'audio/mpeg',
    ACL: 'public-read' as const
  };

  const result = await s3.upload(uploadParams).promise();
  return result.Location;
}

async function remixMusic(audioBuffers: Buffer[], projectId: number): Promise<Buffer> {
  console.log(`AI remixing ${audioBuffers.length} tracks for Project ${projectId}...`);
  
  // 완전 무료 믹싱 로직 사용
  return await simpleMixing(audioBuffers, projectId);
}

// 완전 무료 믹싱 로직
async function simpleMixing(audioBuffers: Buffer[], projectId: number): Promise<Buffer> {
  console.log(`Free mixing ${audioBuffers.length} tracks for Project ${projectId}...`);
  
  if (audioBuffers.length === 1) {
    return audioBuffers[0];
  }
  
  // 간단한 오디오 믹싱 시뮬레이션
  // 실제로는 여기에 FFmpeg 또는 Web Audio API 로직 구현
  console.log('Simulating AI audio mixing...');
  
  // 트랙들의 메타데이터 분석
  const trackAnalysis = audioBuffers.map((buffer, index) => ({
    index,
    size: buffer.length,
    energy: calculateEnergyLevel(buffer)
  }));
  
  // 가장 에너지가 높은 트랙을 베이스로 선택
  const baseTrack = trackAnalysis.reduce((prev, current) => 
    current.energy > prev.energy ? current : prev
  );
  
  console.log(`Selected track ${baseTrack.index} as base (energy: ${baseTrack.energy})`);
  
  // AI 스타일 믹싱 시뮬레이션
  const mixedBuffer = await simulateAIMixing(audioBuffers, baseTrack.index, projectId);
  
  return mixedBuffer;
}

// 오디오 에너지 레벨 계산 (간단한 추정)
function calculateEnergyLevel(buffer: Buffer): number {
  let energy = 0;
  for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
    energy += Math.abs(buffer[i]);
  }
  return energy / Math.min(buffer.length, 1000);
}

// AI 믹싱 시뮬레이션
async function simulateAIMixing(audioBuffers: Buffer[], baseIndex: number, projectId: number): Promise<Buffer> {
  console.log(`AI simulation: Mixing tracks for project ${projectId}`);
  
  // 베이스 트랙 선택
  let mixedBuffer = audioBuffers[baseIndex];
  
  // 다른 트랙들과 "조화" 시뮬레이션
  for (let i = 0; i < audioBuffers.length; i++) {
    if (i !== baseIndex) {
      console.log(`Blending track ${i} with base track`);
      // 실제로는 오디오 신호 처리
      // 여기서는 더 큰 버퍼를 선택하여 "믹스" 시뮬레이션
      if (audioBuffers[i].length > mixedBuffer.length) {
        mixedBuffer = audioBuffers[i];
      }
    }
  }
  
  console.log(`AI mixing complete for project ${projectId}`);
  return mixedBuffer;
}

async function completeAIProcessing(projectId: number, resultS3Url: string) {
  const provider = new ethers.providers.JsonRpcProvider(MONAD_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  const contract = new ethers.Contract(
    MUSIC_HUB_ADDRESS,
    MUSIC_HUB_ABI,
    wallet
  );

  const sepoliaReceiver = process.env.SEPOLIA_GATEWAY_ADDRESS!;
  
  const tx = await contract.completeAIProcessing(
    projectId,
    resultS3Url,
    sepoliaReceiver
  );
  
  await tx.wait();
  console.log('AI processing completed for project:', projectId);
}