export interface GoldenCase {
  id: string;
  kind: 'plan' | 'recalc';
  profile?: Record<string, unknown>;
  itinerary?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  from?: string;
  changes?: Record<string, unknown>;
}
export const cases: GoldenCase[];
