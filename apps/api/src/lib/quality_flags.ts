/**
 * Bitmask on `street_segments.quality_flags`. Combine with `|`, test with `&`.
 * Undefined bits are reserved for future QA dimensions.
 */
export const SEGMENT_QUALITY = {
  /** Extractor / pipeline reported low confidence for this segment. */
  LOW_CONFIDENCE_EXTRACTION: 1 << 0,
} as const;

export type SegmentQualityFlag =
  (typeof SEGMENT_QUALITY)[keyof typeof SEGMENT_QUALITY];
