// Google Ads API Enums
export enum CampaignStatus {
  UNSPECIFIED = 0,
  UNKNOWN = 1,
  ENABLED = 2,
  PAUSED = 3,
  REMOVED = 4,
}

export enum KeywordMatchType {
  UNSPECIFIED = 0,
  EXACT = 1,
  PHRASE = 2,
  BROAD = 3,
}

export enum AdGroupCriterionStatus {
  UNSPECIFIED = 0,
  ENABLED = 1,
  PAUSED = 2,
  REMOVED = 3,
}

export enum AdGroupAdStatus {
  UNSPECIFIED = 0,
  ENABLED = 1,
  PAUSED = 2,
  REMOVED = 3,
}

export enum BiddingStrategyType {
  UNSPECIFIED = 0,
  MANUAL_CPC = 1,
  MANUAL_CPM = 2,
  TARGET_CPA = 3,
  TARGET_ROAS = 4,
  MAXIMIZE_CONVERSIONS = 5,
  MAXIMIZE_CONVERSION_VALUE = 6,
  TARGET_IMPRESSION_SHARE = 7,
  MAXIMIZE_CLICKS = 8,
}

// Helper functions
export function getCampaignStatusName(status: number): string {
  return CampaignStatus[status] || `Unknown (${status})`;
}

export function getKeywordMatchTypeName(matchType: number): string {
  return KeywordMatchType[matchType] || `Unknown (${matchType})`;
}