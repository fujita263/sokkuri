// lib/trialToken.ts
import jwt from "jsonwebtoken";

export type TrialPayload = { journeyId: string; tenantId: string };

const SECRET = process.env.TRIAL_JWT_SECRET!;
if (!SECRET) {
  // ビルドや起動時に SECRET 未設定を検知
  // 本番では必ず .env に TRIAL_JWT_SECRET を入れてください
  console.warn("TRIAL_JWT_SECRET is not set");
}

export function signTrialToken(payload: TrialPayload, minutes = 60) {
  return jwt.sign(payload, SECRET, { algorithm: "HS256", expiresIn: `${minutes}m` });
}

export function verifyTrialToken(token: string): TrialPayload {
  return jwt.verify(token, SECRET) as TrialPayload;
}
