export interface RewardedAd {
  id: string;
  title: string;
  sponsor: string;
  description: string;
  durationSeconds: number;
  rewardEst: number; // Dynamic estimated yield value in Rand
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
  showRewardedAd: (
    ad: RewardedAd,
    onProgress: (remainingSeconds: number, totalSeconds: number) => void,
    onComplete: (result: AdWatchResult) => void,
    onError: (errorMsg: string) => void
  ) => () => void; // returns cancel function
}

/**
 * Modular Placeholder Rewarded Ads Service.
 * Implements IRewardedAdsService interface.
 * Can be swapped cleanly with AppLovin MAX SDK without altering Orbit Rewards UI logic.
 */
class PlaceholderRewardedAdsService implements IRewardedAdsService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    // Simulate SDK initialization
    await new Promise(res => setTimeout(res, 200));
    this.isInitialized = true;
    return true;
  }

  async isAdReady(): Promise<boolean> {
    return true;
  }

  getAvailableAds(): RewardedAd[] {
    return [
      {
        id: "ad-orbit-pro",
        title: "Orbit AI Business Suite",
        sponsor: "Orbit Technology",
        description: "Explore AI-powered business tools & smart automation.",
        durationSeconds: 8,
        rewardEst: 1.50,
        category: "Technology",
        bannerGradient: "from-slate-900 to-blue-900"
      },
      {
        id: "ad-fintech-sa",
        title: "FinTech SA Digital Banking",
        sponsor: "FinTech SA",
        description: "Next-gen zero-fee digital banking and instant rewards.",
        durationSeconds: 10,
        rewardEst: 2.00,
        category: "Finance",
        bannerGradient: "from-slate-900 to-indigo-900"
      },
      {
        id: "ad-cloud-hosting",
        title: "Cloud Scale High Performance Hosting",
        sponsor: "Cloud Scale",
        description: "Reliable SSD cloud servers with 99.99% uptime guarantee.",
        durationSeconds: 7,
        rewardEst: 1.25,
        category: "Web & Tech",
        bannerGradient: "from-slate-900 to-slate-800"
      },
      {
        id: "ad-ecommerce-plus",
        title: "E-Commerce Growth Masterclass",
        sponsor: "Retail Boost",
        description: "Scale your online brand with modern automated tools.",
        durationSeconds: 8,
        rewardEst: 1.75,
        category: "Education",
        bannerGradient: "from-blue-950 to-slate-900"
      }
    ];
  }

  showRewardedAd(
    ad: RewardedAd,
    onProgress: (remainingSeconds: number, totalSeconds: number) => void,
    onComplete: (result: AdWatchResult) => void,
    onError: (errorMsg: string) => void
  ): () => void {
    let remaining = ad.durationSeconds;
    let cancelled = false;

    // Trigger initial progress
    onProgress(remaining, ad.durationSeconds);

    const interval = setInterval(() => {
      if (cancelled) {
        clearInterval(interval);
        return;
      }

      remaining -= 1;
      onProgress(remaining, ad.durationSeconds);

      if (remaining <= 0) {
        clearInterval(interval);
        // Completed & Verified
        onComplete({
          success: true,
          adId: ad.id,
          adTitle: ad.title,
          rewardAmount: ad.rewardEst,
          verified: true,
          message: "Advert completed successfully! Reward verified."
        });
      }
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      onError("Ad playback was cancelled before completion. Reward forfeited.");
    };
  }
}

// Singleton Service Instance
let instance: IRewardedAdsService | null = null;

export function getRewardedAdsService(): IRewardedAdsService {
  if (!instance) {
    instance = new PlaceholderRewardedAdsService();
  }
  return instance;
}
