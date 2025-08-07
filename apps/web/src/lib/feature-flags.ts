interface FeatureFlags {
  optimizedQueries: boolean;
  rateLimiting: boolean;
  performanceMonitoring: boolean;
  caching: boolean;
}

class FeatureFlagManager {
  private flags: FeatureFlags = {
    optimizedQueries: false,
    rateLimiting: false,
    performanceMonitoring: false,
    caching: false,
  };

  constructor() {
    this.loadFlags();
  }

  private loadFlags(): void {
    // 環境変数からフィーチャーフラグを読み込み
    this.flags = {
      optimizedQueries: process.env.FEATURE_OPTIMIZED_QUERIES === 'true',
      rateLimiting: process.env.FEATURE_RATE_LIMITING === 'true',
      performanceMonitoring: process.env.FEATURE_PERFORMANCE_MONITORING === 'true',
      caching: process.env.FEATURE_CACHING === 'true',
    };
  }

  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature];
  }

  enableFeature(feature: keyof FeatureFlags): void {
    this.flags[feature] = true;
  }

  disableFeature(feature: keyof FeatureFlags): void {
    this.flags[feature] = false;
  }
}

export const featureFlags = new FeatureFlagManager();
