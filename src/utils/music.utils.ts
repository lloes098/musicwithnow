import { MusicGenre, WorkType } from '../types/music.types';

/**
 * Get genre color for UI display
 */
export function getGenreColor(genre: MusicGenre): string {
  const colors: Record<MusicGenre, string> = {
    [MusicGenre.ELECTRONIC]: '#00D4FF',
    [MusicGenre.HIP_HOP]: '#FF6B35',
    [MusicGenre.POP]: '#FF69B4',
    [MusicGenre.ROCK]: '#DC143C',
    [MusicGenre.JAZZ]: '#9966CC',
    [MusicGenre.CLASSICAL]: '#CD853F',
    [MusicGenre.LO_FI]: '#98FB98',
    [MusicGenre.AFROBEATS]: '#FF8C00',
  };
  
  return colors[genre] || '#6366F1';
}

/**
 * Get work type icon
 */
export function getWorkTypeIcon(workType: WorkType): string {
  const icons: Record<WorkType, string> = {
    [WorkType.MELODY_CREATION]: '🎵',
    [WorkType.RHYTHM_SECTION]: '🥁',
    [WorkType.VOCAL_RECORDING]: '🎤',
    [WorkType.RAP_VERSE]: '🎙️',
    [WorkType.MIXING]: '🎚️',
    [WorkType.MASTERING]: '🎧',
  };
  
  return icons[workType] || '🎹';
}

/**
 * Calculate BPM from audio analysis (mock implementation)
 */
export function calculateBPM(waveformData: number[]): number {
  // This is a simplified mock implementation
  // In real implementation, you would use proper audio analysis
  if (!waveformData || waveformData.length === 0) {
    return 120; // Default BPM
  }
  
  // Mock BPM calculation based on waveform variance
  const variance = waveformData.reduce((acc, val, idx) => {
    if (idx === 0) return acc;
    return acc + Math.abs(val - waveformData[idx - 1]);
  }, 0) / waveformData.length;
  
  // Map variance to reasonable BPM range (60-200)
  const bpm = Math.round(60 + (variance * 140));
  return Math.min(200, Math.max(60, bpm));
}

/**
 * Detect key from audio data (mock implementation)
 */
export function detectKey(waveformData: number[]): string {
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const modes = ['', 'm']; // Major and minor
  
  if (!waveformData || waveformData.length === 0) {
    return 'C'; // Default key
  }
  
  // Mock key detection based on waveform characteristics
  const sum = waveformData.reduce((acc, val) => acc + Math.abs(val), 0);
  const keyIndex = Math.floor(sum * keys.length) % keys.length;
  const modeIndex = Math.floor(sum * modes.length) % modes.length;
  
  return keys[keyIndex] + modes[modeIndex];
}

/**
 * Calculate audio file duration from file size (rough estimate)
 */
export function estimateDuration(fileSize: number, bitrate: number = 320): number {
  // fileSize in bytes, bitrate in kbps
  // Duration in seconds
  const bitsPerByte = 8;
  const totalBits = fileSize * bitsPerByte;
  const bitrateInBps = bitrate * 1000;
  
  return Math.round(totalBits / bitrateInBps);
}

/**
 * Generate waveform data from audio file (mock implementation)
 */
export function generateMockWaveform(fileSize: number, length: number = 200): number[] {
  const waveform: number[] = [];
  
  // Use file size as seed for reproducible waveform
  let seed = fileSize;
  
  for (let i = 0; i < length; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const normalized = seed / 233280;
    waveform.push(normalized);
  }
  
  return waveform;
}

/**
 * Check if two genres are compatible for collaboration
 */
export function areGenresCompatible(genre1: MusicGenre, genre2: MusicGenre): boolean {
  const compatibilityMatrix: Record<MusicGenre, MusicGenre[]> = {
    [MusicGenre.ELECTRONIC]: [MusicGenre.POP, MusicGenre.HIP_HOP, MusicGenre.LO_FI],
    [MusicGenre.HIP_HOP]: [MusicGenre.ELECTRONIC, MusicGenre.POP, MusicGenre.AFROBEATS],
    [MusicGenre.POP]: [MusicGenre.ELECTRONIC, MusicGenre.HIP_HOP, MusicGenre.ROCK],
    [MusicGenre.ROCK]: [MusicGenre.POP, MusicGenre.CLASSICAL],
    [MusicGenre.JAZZ]: [MusicGenre.CLASSICAL, MusicGenre.LO_FI],
    [MusicGenre.CLASSICAL]: [MusicGenre.JAZZ, MusicGenre.ROCK],
    [MusicGenre.LO_FI]: [MusicGenre.JAZZ, MusicGenre.ELECTRONIC],
    [MusicGenre.AFROBEATS]: [MusicGenre.HIP_HOP, MusicGenre.ELECTRONIC],
  };
  
  return genre1 === genre2 || (compatibilityMatrix[genre1]?.includes(genre2) ?? false);
}

/**
 * Calculate collaboration score between genres
 */
export function calculateCollaborationScore(genre1: MusicGenre, genre2: MusicGenre): number {
  if (genre1 === genre2) return 100;
  if (areGenresCompatible(genre1, genre2)) return 75;
  return 25;
}

/**
 * Get recommended work types for a genre
 */
export function getRecommendedWorkTypes(genre: MusicGenre): WorkType[] {
  const recommendations: Record<MusicGenre, WorkType[]> = {
    [MusicGenre.ELECTRONIC]: [WorkType.MELODY_CREATION, WorkType.RHYTHM_SECTION, WorkType.MIXING],
    [MusicGenre.HIP_HOP]: [WorkType.RAP_VERSE, WorkType.RHYTHM_SECTION, WorkType.MIXING],
    [MusicGenre.POP]: [WorkType.VOCAL_RECORDING, WorkType.MELODY_CREATION, WorkType.MIXING],
    [MusicGenre.ROCK]: [WorkType.MELODY_CREATION, WorkType.RHYTHM_SECTION, WorkType.MASTERING],
    [MusicGenre.JAZZ]: [WorkType.MELODY_CREATION, WorkType.MASTERING],
    [MusicGenre.CLASSICAL]: [WorkType.MELODY_CREATION, WorkType.MASTERING],
    [MusicGenre.LO_FI]: [WorkType.MELODY_CREATION, WorkType.MIXING],
    [MusicGenre.AFROBEATS]: [WorkType.RHYTHM_SECTION, WorkType.VOCAL_RECORDING, WorkType.MIXING],
  };
  
  return recommendations[genre] || Object.values(WorkType);
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Convert file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < sizes.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${sizes[unitIndex]}`;
}

/**
 * Calculate music trend score based on various factors
 */
export function calculateTrendScore(
  plays: number,
  likes: number,
  shares: number,
  comments: number,
  ageInDays: number
): number {
  // Weighted scoring algorithm
  const playWeight = 1;
  const likeWeight = 2;
  const shareWeight = 3;
  const commentWeight = 2;
  
  // Age decay factor (newer content gets higher score)
  const ageDecay = Math.exp(-ageInDays / 30); // 30-day half-life
  
  const rawScore = (
    plays * playWeight +
    likes * likeWeight +
    shares * shareWeight +
    comments * commentWeight
  ) * ageDecay;
  
  // Normalize to 0-100 scale
  return Math.min(100, Math.round(rawScore / 100));
}

/**
 * Generate mood descriptors for a genre
 */
export function getGenreMoods(genre: MusicGenre): string[] {
  const moods: Record<MusicGenre, string[]> = {
    [MusicGenre.ELECTRONIC]: ['energetic', 'futuristic', 'dreamy', 'intense', 'euphoric'],
    [MusicGenre.HIP_HOP]: ['aggressive', 'confident', 'smooth', 'gritty', 'triumphant'],
    [MusicGenre.POP]: ['upbeat', 'catchy', 'emotional', 'fun', 'romantic'],
    [MusicGenre.ROCK]: ['powerful', 'rebellious', 'raw', 'energetic', 'emotional'],
    [MusicGenre.JAZZ]: ['sophisticated', 'smooth', 'improvisational', 'soulful', 'complex'],
    [MusicGenre.CLASSICAL]: ['elegant', 'dramatic', 'peaceful', 'majestic', 'intricate'],
    [MusicGenre.LO_FI]: ['chill', 'nostalgic', 'relaxing', 'atmospheric', 'mellow'],
    [MusicGenre.AFROBEATS]: ['rhythmic', 'vibrant', 'danceable', 'celebratory', 'cultural'],
  };
  
  return moods[genre] || ['creative', 'expressive', 'artistic'];
}