export type ChipColor = 'white' | 'red' | 'green' | 'blue' | 'black';

export type ChipConfig = {
  label: string;
  value: number;
  color: string;
  bgColor: string;
};

export type RoboflowPrediction = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  detection_id: string;
};

export type RoboflowResponse = {
  predictions: RoboflowPrediction[];
};

export type ChipCountResult = {
  chipClass: string;
  label: string;
  count: number;
  value: number;
  total: number;
  color: string;
  bgColor: string;
};

export type CounterStep = 'pick' | 'draw' | 'preview' | 'results';

export type DisplayRect = {
  offsetX: number;
  offsetY: number;
  scale: number;
  displayWidth: number;
  displayHeight: number;
};

/** Chip class name → config mapping (Roboflow class names) */
export const CHIP_MAP: Record<string, ChipConfig> = {
  'White PokerChip': { label: 'Blanca', value: 5, color: '#FFFFFF', bgColor: '#f5f5f5' },
  'Red PokerChip': { label: 'Roja', value: 10, color: '#DC2626', bgColor: '#fef2f2' },
  'Green PokerChip': { label: 'Verde', value: 25, color: '#16A34A', bgColor: '#f0fdf4' },
  'Blue PokerChip': { label: 'Azul', value: 50, color: '#2563EB', bgColor: '#eff6ff' },
  'Black PokerChip': { label: 'Negra', value: 100, color: '#1a1a1a', bgColor: '#f5f5f5' },
};

export const CONFIDENCE_THRESHOLD = 0.4;
