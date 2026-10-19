export interface RewardedAd {
  id: string;
  title: string;
  sponsor: string;
  description: string;
  durationSeconds: number;
  rewardEst: number;
  category: string;
  iconName?: string;
  bannerGradient: string;
}

export interface AdWatchResult {
  success: boolean;
  adId: string;
  adTitle: string;
  rewardAmount: number;
  verified: boolean;
  message?: string;
}

export interface IRewardedAdsService {
  initialize: () => Promise<boolean>;
  isAdReady: () => Promise<boolean>;
  getAvailableAds: () => RewardedAd[];
  isFeatureEnabled: () => boolean;
  getPolicyNotice: () => string;
  showRewardedAd: (
    ad: RewardedAd,
    onProgress: (remainingSeconds: number, totalSeconds: number) => void,
    onComplete: (result: AdWatchResult) => void,
    onError: (errorMsg: string) => void
  ) => () => void;
}

/**
 * Compliant Rewarded Ads Service State.
 *
 * GOOGLE PUBLISHER POLICY ENFORCEMENT:
 * Ordinary AdSense display ads must NEVER be incentivized or linked to rewards.
 * Web-based rewarded ad sessions are strictly disabled pending official, fully-compliant
 * Google Rewarded Ads SDK certification for this web app.
 *
 * No fake ad-completion callbacks or simulated revenue may be generated.
 * Users earn platform credits strictly through authentic non-ad activities:
 * verified account referrals and legitimate skill-based Showdown Quizzes.
 */
class CompliantRewardedAdsService implements IRewardedAdsService {
  private featureEnabled = false;

  async initialize(): Promise<boolean> {
    return true;
  }

  async isAdReady(): Promise<boolean> {
    return false; // Strictly false: web rewarded format is currently disabled
  }

  isFeatureEnabled(): boolean {
    return this.featureEnabled;
  }

  getPolicyNotice(): string {
    return "Web ad-view rewards are disabled in accordance with Google Publisher Policies. Users earn platform credits exclusively through verified community referrals and educational Showdown Quizzes.";
  }

  getAvailableAds(): RewardedAd[] {
    return []; // No active ad units eligible for reward claims
  }

  showRewardedAd(
    ad: RewardedAd,
    _onProgress: (remainingSeconds: number, totalSeconds: number) => void,
    _onComplete: (result: AdWatchResult) => void,
    onError: (errorMsg: string) => void
  ): () => void {
    onError("Rewarded ad playback is disabled pending compliant SDK certification. Please participate in Showdown Quizzes or the Agent referral program to earn credits.");
    return () => {};
  }
}

let instance: IRewardedAdsService | null = null;

export function getRewardedAdsService(): IRewardedAdsService {
  if (!instance) {
    instance = new CompliantRewardedAdsService();
  }
  return instance;
}
