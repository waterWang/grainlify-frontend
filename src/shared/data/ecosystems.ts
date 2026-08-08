import { getOnBrandGradient } from "../utils/motionVariants";

export interface EcosystemBadge {
  key: string;
  name: string;
  symbol: string;
  status: "live" | "coming-soon";
  gradient: string;
}

// Stellar and Starknet are real, already-active ecosystems in production
// today (confirmed via GET /ecosystems). Flare and Solana are the platform's
// next planned networks, per direct word from the team - shown as
// "Coming Soon" rather than claimed as live.
export const ECOSYSTEMS: EcosystemBadge[] = [
  { key: "stellar", name: "Stellar", symbol: "XLM", status: "live", gradient: getOnBrandGradient("Stellar") },
  { key: "starknet", name: "Starknet", symbol: "STRK", status: "live", gradient: getOnBrandGradient("Starknet") },
  { key: "flare", name: "Flare", symbol: "FLR", status: "coming-soon", gradient: getOnBrandGradient("Flare") },
  { key: "solana", name: "Solana", symbol: "SOL", status: "coming-soon", gradient: getOnBrandGradient("Solana") },
];
