import {
  CHIP_MAP,
  CONFIDENCE_THRESHOLD,
  OVERLAP_THRESHOLD,
  type ChipCountResult,
  type RoboflowPrediction,
  type RoboflowResponse,
} from '@/types/chip-counter';

const ROBOFLOW_API_KEY = process.env.EXPO_PUBLIC_ROBOFLOW_API_KEY ?? '';
const ROBOFLOW_URL = 'https://serverless.roboflow.com/poker-chip-count/2';

export async function detectChips(base64Image: string): Promise<RoboflowResponse> {
  if (!ROBOFLOW_API_KEY) {
    throw new Error('EXPO_PUBLIC_ROBOFLOW_API_KEY no está configurada');
  }

  const params = new URLSearchParams({
    api_key: ROBOFLOW_API_KEY,
    confidence: String(CONFIDENCE_THRESHOLD),
    overlap: String(OVERLAP_THRESHOLD),
  });

  const response = await fetch(`${ROBOFLOW_URL}?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: base64Image,
  });

  if (!response.ok) {
    throw new Error(`Error de Roboflow: ${response.status}`);
  }

  return response.json();
}

export function aggregateResults(predictions: RoboflowPrediction[]): {
  results: ChipCountResult[];
  grandTotal: number;
} {
  const countMap = new Map<string, number>();
  for (const p of predictions) {
    countMap.set(p.class, (countMap.get(p.class) ?? 0) + 1);
  }

  const results: ChipCountResult[] = [];
  for (const [chipClass, count] of countMap) {
    const config = CHIP_MAP[chipClass];
    if (!config) continue;
    results.push({
      chipClass,
      label: config.label,
      count,
      value: config.value,
      total: count * config.value,
      color: config.color,
      bgColor: config.bgColor,
    });
  }

  // Sort by value descending
  results.sort((a, b) => b.value - a.value);

  const grandTotal = results.reduce((sum, r) => sum + r.total, 0);

  return { results, grandTotal };
}
