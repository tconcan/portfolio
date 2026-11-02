export const ABOUT = {
  title: "About Me",
  eyebrow: "Get to know me",
  portrait: {
    // Two sizes so phones don't download the desktop image.
    src: "/media/portrait-800.webp",
    srcSet: "/media/portrait-480.webp 480w, /media/portrait-800.webp 800w",
    width: 800,
    height: 803,
    alt: "Tom Concannon holding an iced coffee and a Mike's Pastry box",
  },
  // Each paragraph lines up with one of the hero's pillars.
  paragraphs: [
    {
      label: "Engineer",
      text: "Through my coursework and projects, I've developed a strong foundation in embedded systems, working with everything from IoT devices to real-time operating systems. I'm eager to apply my knowledge and continue learning in a professional setting.",
    },
    {
      label: "Leader",
      text: "I'm a leader. I enjoy taking initiative, and motivating diverse teams towards success. My history of leading projects and mentoring peers has honed my ability to inspire and guide others effectively.",
    },
  ],
  links: [
    { label: "Experience", href: "#experience" },
    { label: "Involvement", href: "#involvement" },
  ],
} as const;
