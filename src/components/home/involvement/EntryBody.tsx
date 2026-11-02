import type { Involvement, Status } from "../../../data/involvement";
import { dateRange } from "../../../data/involvement";
import { ExternalLinkIcon } from "../../layout/icons";
import { GRADIENT_TEXT } from "../../ui/styles";

const STATUS_PILL: Record<Status, { label: string; className: string } | null> = {
  upcoming: { label: "Upcoming", className: "border-dashed border-blue-300/60 text-blue-200" },
  now: { label: "Now", className: "border-cyan-300/50 bg-cyan-300/10 text-cyan-200" },
  past: null,
};

// The photo bleeds to the card edges, so its negative margins must match the
// card's padding (p-4 sm:p-6 lg:p-7).
const PHOTO_BLEED =
  "-mx-4 -mt-4 mb-4 w-[calc(100%+2rem)] sm:-mx-6 sm:-mt-6 sm:w-[calc(100%+3rem)] lg:-mx-7 lg:-mt-7 lg:w-[calc(100%+3.5rem)]";

interface Props {
  item: Involvement;
  status: Status;
}

/** Contents of one involvement entry: photo, dates, title, story, tags, links. */
export default function EntryBody({ item, status }: Props) {
  const pill = STATUS_PILL[status];

  return (
    <>
      {item.photo && (
        <img
          src={item.photo.src}
          alt={item.photo.alt}
          width={item.photo.width}
          height={item.photo.height}
          loading="lazy"
          decoding="async"
          className={`max-w-none object-cover ${PHOTO_BLEED}`}
          style={{ aspectRatio: item.photo.aspect ?? "21 / 9", objectPosition: item.photo.focus ?? "50% 50%" }}
        />
      )}

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        {pill && (
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${pill.className}`}>
            {pill.label}
          </span>
        )}
        <time className="text-sm text-gray-400">{dateRange(item, status)}</time>
      </div>

      <h3 className="text-xl font-bold text-white sm:text-2xl">{item.org}</h3>
      <p className={`mt-1 font-semibold sm:text-lg ${GRADIENT_TEXT}`}>{item.role}</p>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-gray-300 sm:text-base">
        {item.summary}
      </p>

      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Highlights">
        {item.highlights.map((h) => (
          <li key={h} className="rounded-full border border-purple-400/30 bg-purple-500/15 px-3 py-1 text-xs text-purple-100 sm:text-sm">
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        <div className="-mb-1 border-t border-white/10 pt-3">
          <div className="-mx-3 flex flex-wrap gap-1">
            {item.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
                <ExternalLinkIcon className="size-3.5 transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
