// ===== Enums =====

export type TripStatus = "GENERATING" | "READY" | "FAILED";

export type TravelStyle = "RELAXED" | "BALANCED" | "INTENSE";

export type BudgetLevel = "LOW" | "MEDIUM" | "HIGH";

export type GroupComposition =
  | "SOLO"
  | "COUPLE"
  | "FRIENDS"
  | "FAMILY_WITH_KIDS"
  | "FAMILY_NO_KIDS"
  | "OTHER";

export type GenderMix =
  | "FEMALE_ONLY"
  | "MALE_ONLY"
  | "MIXED"
  | "UNKNOWN";

export type TimeBlock = "MORNING" | "AFTERNOON" | "EVENING";

export type ItineraryItemType =
  | "FOOD"
  | "ATTRACTION"
  | "TRANSIT"
  | "NOTE";

  export type TransitMode =
  | "WALK"
  | "METRO"
  | "BUS"
  | "TRAM"
  | "TRAIN"
  | "TAXI"
  | "CAR"
  | "TRANSFER"
  | "MIXED";

export type DisplayLanguage = "ENGLISH" | "HEBREW";

// ===== Request Types =====
export type TransitInfo = {
    from: string;
    mode: TransitMode;
    estimatedMinutes?: number | null;
    directions?: string | null;
  };

export type TripGroupRequest = {
  composition: GroupComposition;
  peopleCount: number;
  minAge?: number | null;
  maxAge?: number | null;
  genderMix: GenderMix;
};

export type PlanTripRequest = {
  userId?: string;
  destination: string;
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd

  tripGroup: TripGroupRequest;

  travelStyle: TravelStyle;
  budgetLevel: BudgetLevel;

  interests: string[];
  constraints?: string[];

  hotelName?: string;
  hotelAddressOrArea?: string;
  freeText?: string;
  includeDirections?: boolean;
  /** Matches backend enum names (note PUBLIC_TRANPORT spelling). */
  transportPreferences?: "WALKING" | "PUBLIC_TRANPORT" | "TAXI" | "CAR" | "MIXED";

  displayLanguage?: DisplayLanguage;
};

// ===== Response Types =====

export type TripGroupResponse = {
  composition: GroupComposition;
  peopleCount: number;
  minAge?: number | null;
  maxAge?: number | null;
  genderMix: GenderMix;
};

export type TripPlanResponse = {
  id: string;

  destination: string;
  startDate: string;
  endDate: string;

  tripGroup: TripGroupResponse | null;

  travelStyle: TravelStyle | null;
  budgetLevel: BudgetLevel | null;

  itinerary?: Itinerary | null;
  displayLanguage?: DisplayLanguage | null;

  tripStatus: TripStatus;
  errorMessage?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

// ===== Itinerary Types =====

export type Itinerary = {
  dayPlans: DayPlan[];
};

export type DayPlan = {
  date: string; // yyyy-MM-dd
  title: string;
  blocks: BlockPlan[];
};

export type BlockPlan = {
  timeBlock: TimeBlock;
  items: ItineraryItem[];
};

export type ItineraryItem = {
  type: ItineraryItemType;
  name: string;
  location?: Location | null;
  notes?: string | null;
  transit?: TransitInfo | null;
};

export type Location = {
  name: string;
  lat?: number | null;
  lng?: number | null;
};

// ---- Search history (for Recent searches UI) ----
export type SearchHistoryResponse = {
  id: string;
  queryText: string;
  destination?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budgetLevel?: BudgetLevel | null;
  interests?: string[] | null;
  constraints?: string[] | null;
  createdAt?: string | null;
};
