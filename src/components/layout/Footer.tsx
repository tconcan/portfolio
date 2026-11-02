import { CONTACT_EMAIL, COPYRIGHT_NAME, SOCIAL_LINKS, type SocialIcon } from "../../data/site";
import { GRADIENT_TEXT } from "../ui/styles";
import { GitHubIcon, LinkedInIcon, RomaTomIcon } from "./icons";

function SocialGraphic({ icon }: { icon: SocialIcon }) {
  switch (icon) {
    case "romatom":
      return <RomaTomIcon className="h-6" />;
    case "linkedin":
      return <LinkedInIcon className="size-6" />;
    case "github":
      return <GitHubIcon className="size-6" />;
  }
}

/** Site footer: contact email, socials, copyright. Same content as the old site, glass styling. */
export default function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 bg-gray-900/70 backdrop-blur-md" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Thin gradient rule along the top edge, echoing the background palette. */}
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-10 text-center sm:px-6">
        <h2 className={`mb-2 text-sm font-semibold tracking-[0.2em] uppercase ${GRADIENT_TEXT}`}>Contact</h2>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="nav-glow text-lg text-gray-200 transition-colors hover:text-white sm:text-xl"
        >
          {CONTACT_EMAIL}
        </a>

        <ul className="mt-6 flex items-center justify-center gap-2">
          {SOCIAL_LINKS.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                title={link.label}
                className="nav-glow grid size-11 place-items-center rounded-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <SocialGraphic icon={link.icon} />
              </a>
            </li>
          ))}
        </ul>

        <p className="mt-8 border-t border-white/10 pt-6 text-sm text-gray-400">
          &copy; {new Date().getFullYear()} {COPYRIGHT_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
