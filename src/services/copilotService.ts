import type { VentureCopilotRequest, VentureCopilotResponse } from '../types';

export const analyzeVentureEvidence = async (
  payload: VentureCopilotRequest,
): Promise<VentureCopilotResponse> => {
  const response = await fetch('/api/copilot/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'The Venture Copilot request failed.');
  }

  return response.json() as Promise<VentureCopilotResponse>;
};
