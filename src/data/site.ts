export const OWNER_NAME = "Tom Concannon";
export const CONTACT_EMAIL = "thomascon04@gmail.com";
export const COPYRIGHT_NAME = "Thomas Concannon";

export const HERO = {
  greeting: "Hi, I'm Tom",
  pillars: ["Engineering", "Leadership", "Entrepreneurship"],
  photo: "/media/tom.webp",
} as const;

export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Projects", to: "/projects" },
  { label: "Travel", to: "/travel" },
] as const;

export type SocialIcon = "romatom" | "linkedin" | "github";

export interface SocialLink {
  label: string;
  href: string;
  icon: SocialIcon;
}

export const SOCIAL_LINKS: readonly SocialLink[] = [
  { label: "Roma Tom", href: "https://romatom.com/", icon: "romatom" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/thomascon/", icon: "linkedin" },
  { label: "GitHub", href: "https://github.com/tconcan", icon: "github" },
];
