// Lookups for the Travel page's coverage stats.

/**
 * The 50 states as a tile map: [code, column, row] on an 11 × 8 grid laid
 * out roughly like the real map (Alaska and Hawaii tucked in the corners).
 */
export const STATE_TILES: [string, number, number][] = [
  ["AK", 0, 0], ["ME", 10, 0],
  ["VT", 9, 1], ["NH", 10, 1],
  ["WA", 0, 2], ["ID", 1, 2], ["MT", 2, 2], ["ND", 3, 2], ["MN", 4, 2], ["IL", 5, 2], ["WI", 6, 2], ["MI", 7, 2], ["NY", 8, 2], ["RI", 9, 2], ["MA", 10, 2],
  ["OR", 0, 3], ["NV", 1, 3], ["WY", 2, 3], ["SD", 3, 3], ["IA", 4, 3], ["IN", 5, 3], ["OH", 6, 3], ["PA", 7, 3], ["NJ", 8, 3], ["CT", 9, 3],
  ["CA", 0, 4], ["UT", 1, 4], ["CO", 2, 4], ["NE", 3, 4], ["MO", 4, 4], ["KY", 5, 4], ["WV", 6, 4], ["VA", 7, 4], ["MD", 8, 4], ["DE", 9, 4],
  ["AZ", 1, 5], ["NM", 2, 5], ["KS", 3, 5], ["AR", 4, 5], ["TN", 5, 5], ["NC", 6, 5], ["SC", 7, 5],
  ["OK", 3, 6], ["LA", 4, 6], ["MS", 5, 6], ["AL", 6, 6], ["GA", 7, 6],
  ["HI", 0, 7], ["TX", 3, 7], ["FL", 8, 7],
];

export const CONTINENTS = ["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Antarctica"] as const;
export type Continent = (typeof CONTINENTS)[number];

// Country names (and common short forms) by continent, lower-case. Add to
// this if a new country in the sheet isn't counted.
const BY_CONTINENT: Record<Continent, string> = {
  "North America":
    "usa|us|united states|canada|mexico|guatemala|belize|honduras|el salvador|nicaragua|costa rica|panama|cuba|jamaica|haiti|dominican republic|bahamas|barbados|trinidad and tobago|puerto rico|greenland|aruba|curaçao|curacao|bermuda|st. lucia|saint lucia|grenada|antigua and barbuda|dominica|st. kitts and nevis|saint kitts and nevis|st. vincent and the grenadines|cayman islands|turks and caicos|us virgin islands|british virgin islands",
  "South America":
    "brazil|argentina|chile|peru|colombia|ecuador|bolivia|paraguay|uruguay|venezuela|guyana|suriname|french guiana|falkland islands",
  Europe:
    "uk|united kingdom|great britain|england|scotland|wales|northern ireland|ireland|france|germany|spain|portugal|italy|netherlands|holland|belgium|luxembourg|switzerland|austria|liechtenstein|monaco|andorra|san marino|vatican city|malta|iceland|norway|sweden|finland|denmark|estonia|latvia|lithuania|poland|czech republic|czechia|slovakia|hungary|slovenia|croatia|bosnia and herzegovina|serbia|montenegro|kosovo|albania|north macedonia|greece|bulgaria|romania|moldova|ukraine|belarus|russia|cyprus|gibraltar|faroe islands",
  Africa:
    "morocco|algeria|tunisia|libya|egypt|south africa|namibia|botswana|zimbabwe|zambia|mozambique|madagascar|mauritius|seychelles|kenya|tanzania|uganda|rwanda|ethiopia|somalia|ghana|nigeria|senegal|ivory coast|côte d'ivoire|cameroon|angola|malawi|sudan|cape verde|cabo verde|gambia|mali|niger|chad|eswatini|lesotho|democratic republic of the congo|republic of the congo|gabon|benin|togo|liberia|sierra leone|guinea|burkina faso|eritrea|djibouti|mauritania",
  Asia:
    "china|japan|south korea|korea|north korea|taiwan|hong kong|macau|mongolia|india|pakistan|bangladesh|sri lanka|nepal|bhutan|maldives|thailand|vietnam|cambodia|laos|myanmar|malaysia|singapore|indonesia|philippines|brunei|timor-leste|east timor|kazakhstan|uzbekistan|kyrgyzstan|tajikistan|turkmenistan|afghanistan|iran|iraq|syria|lebanon|jordan|israel|palestine|saudi arabia|uae|united arab emirates|qatar|bahrain|kuwait|oman|yemen|turkey|türkiye|georgia|armenia|azerbaijan",
  Oceania:
    "australia|new zealand|fiji|papua new guinea|samoa|tonga|vanuatu|solomon islands|french polynesia|tahiti|new caledonia|palau|micronesia|marshall islands|kiribati|tuvalu|nauru|guam|cook islands",
  Antarctica: "antarctica",
};

const CONTINENT_OF = new Map<string, Continent>(
  CONTINENTS.flatMap((c) => BY_CONTINENT[c].split("|").map((name) => [name, c] as [string, Continent])),
);

/** The continent a country (as written in the sheet) is on, if known. */
export const continentOf = (country: string): Continent | undefined => CONTINENT_OF.get(country.trim().toLowerCase());
