import { motion } from "motion/react";
import { monthLabel, type Project } from "../../data/projects";
import { ExternalLinkIcon } from "../layout/icons";
import { EASE } from "../ui/motion";
import { GLASS_CARD } from "../ui/styles";
import LazyVideo from "./LazyVideo";
import { ORG_PILL } from "./orgStyles";

interface Props {
  project: Project;
  orgPicked: boolean;
  techPicked: (t: string) => boolean;
  /** Its organization pill and tech tags filter the page by that value. */
  onOrg: (org: string) => void;
  onTech: (tech: string) => void;
}

/** One project: media on top (keeping its own shape), then the write-up. */
export default function ProjectCard({ project, orgPicked, techPicked, onOrg, onTech }: Props) {
  const { image, video } = project;
  const media = "block h-auto w-full object-cover";

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE }}
      className={`${GLASS_CARD} group overflow-hidden transition-colors duration-300 hover:border-purple-300/40`}
    >
      <div className="relative overflow-hidden border-b border-white/10 bg-gray-900/60" style={{ aspectRatio: `${image.width} / ${image.height}` }}>
        {video ? (
          <LazyVideo src={video} poster={image.src} label={image.alt} className={media} />
        ) : (
          <img
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
            className={`${media} transition-transform duration-700 group-hover:scale-[1.03]`}
          />
        )}
        <button
          type="button"
          onClick={() => onOrg(project.org)}
          aria-pressed={orgPicked}
          title={`Filter by ${project.org}`}
          className={`absolute top-3 left-3 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-md shadow-black/40 backdrop-blur-md pointer-coarse:backdrop-blur-none transition hover:brightness-125 ${ORG_PILL[project.org]} ${orgPicked ? "ring-2 ring-white/70" : ""}`}
        >
          {project.org}
        </button>
      </div>

      <div className="p-5 sm:p-6">
        <time dateTime={project.date} className="text-sm text-gray-400">
          {monthLabel(project.date)}
        </time>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{project.title}</h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-gray-300">{project.summary}</p>

        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Built with">
          {project.tech.map((t) => (
            <li key={t}>
              <button
                type="button"
                onClick={() => onTech(t)}
                aria-pressed={techPicked(t)}
                title={`Filter by ${t}`}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  techPicked(t)
                    ? "border-purple-300/60 bg-purple-500/35 text-white"
                    : "border-purple-400/30 bg-purple-500/15 text-purple-100 hover:bg-purple-500/30"
                }`}
              >
                {t}
              </button>
            </li>
          ))}
        </ul>

        {project.links.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-3">
            <div className="-mx-3 -mb-1 flex flex-wrap gap-1">
              {project.links.map((link) => (
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
        )}
      </div>
    </motion.article>
  );
}
