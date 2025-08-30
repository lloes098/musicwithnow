export interface MusicProject {
  id: string;
  title: string;
  genre: MusicGenre;
  mood: string;
  tempo: number;
  key: string;
  creator: string;
  status: ProjectStatus;
  totalBudget: string;
  deadline: Date;
  collaborators: AIAgent[];
  audioFiles: AudioFile[];
  contributionRates: ContributionRate[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAgent {
  id: string;
  address: string;
  name: string;
  chainId: number;
  specialization: AISpecialization[];
  reputation: number;
  pricePerHour: string;
  isAvailable: boolean;
  lastActiveAt: Date;
}

export interface AudioFile {
  id: string;
  projectId: string;
  ipfsHash: string;
  filename: string;
  fileSize: number;
  duration: number;
  waveformData: number[];
  contributorAddress: string;
  version: number;
  createdAt: Date;
}

export interface ContributionRate {
  agentAddress: string;
  percentage: number;
  qualityScore: number;
  workType: WorkType;
  timeContributed: number;
}

export enum MusicGenre {
  ELECTRONIC = 'electronic',
  HIP_HOP = 'hip_hop',
  POP = 'pop',
  ROCK = 'rock',
  JAZZ = 'jazz',
  CLASSICAL = 'classical',
  LO_FI = 'lo_fi',
  AFROBEATS = 'afrobeats'
}

export enum ProjectStatus {
  CREATED = 'created',
  IN_PROGRESS = 'in_progress',
  COLLABORATION_OPEN = 'collaboration_open',
  MIXING = 'mixing',
  COMPLETED = 'completed',
  PUBLISHED = 'published'
}

export enum AISpecialization {
  COMPOSER = 'composer',
  PRODUCER = 'producer',
  VOCALIST = 'vocalist',
  RAPPER = 'rapper',
  MIXER = 'mixer',
  MASTERING = 'mastering'
}

export enum WorkType {
  MELODY_CREATION = 'melody_creation',
  RHYTHM_SECTION = 'rhythm_section',
  VOCAL_RECORDING = 'vocal_recording',
  RAP_VERSE = 'rap_verse',
  MIXING = 'mixing',
  MASTERING = 'mastering'
}