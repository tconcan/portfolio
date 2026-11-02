// Write-ups for each trip on the Travel page's Trips card.
//
// A trip is every stop in the sheet sharing the same first tag (Tags column).
// Dates, stops, miles and states are worked out from the sheet; the words
// below are yours. Key each entry by the exact tag. A tag with no entry here
// still shows up, just with its tag as the title and no write-up.
//
// TODO(Tom): the Tucka text is placeholder fluff — replace with the real story.

export interface TripInfo {
  title: string;
  tagline: string;
  summary: string;
  highlights: string[];
  /** Leave the Miles stat off this trip's card. */
  hideMiles?: boolean;
}

export const TRIP_INFO: Record<string, TripInfo> = {
  Tucka: {
    title: "The Tucka Trip",
    tagline: "A lap of the lower 48, one national park at a time",
    summary:
      "My post-grad trip. Me and a high school buddy living out of 2015 Chevy Equinox with 175k miles on it for four and a half months. National Parks, Cities, ",
    highlights: [
      "Getting comfortable with being uncomfortable",
      "Experiencing a diversity of living standards",
      "Taking in just how vast and beautiful it all is",
      "One last stretch of freedom before starting work",
    ],
  },
  // TODO(Tom): placeholder fluff, replace with the real story.
  "Spring Break '26": {
    title: "Spring Break '26",
    hideMiles: true,
    tagline: "Pyrenees powder, Catalan sun and a train to Berlin",
    summary:
      "Two weeks, four countries and not much sleep: fly into Barcelona, drive straight up into the Pyrenees for a week of skiing in Andorra, thaw out back on the Catalan coast, then hop a flight to Amsterdam and a train across to Berlin.",
    highlights: [
      "A week on the slopes at Pas de la Casa",
      "Tapas crawl through the Gothic Quarter",
      "Canals and bikes in Amsterdam",
      "Overland to Berlin by rail",
    ],
  },
};

export function tripInfo(id: string): TripInfo {
  return TRIP_INFO[id] ?? { title: id || "Road trip", tagline: "", summary: "", highlights: [] };
}

// Titles for the United States and World cards on the Travel page (the
// counts come from the sheet).
export const VIEW_INFO: Record<"us" | "world", { title: string }> = {
  us: { title: "Nationwide" },
  world: { title: "Worldwide" },
};
