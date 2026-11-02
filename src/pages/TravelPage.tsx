import { Link } from "react-router";
import { motion } from "motion/react";

// Placeholder so the header link and page transitions work; the real
// travel page is a later task.
export default function TravelPage() {
  return (
    <motion.section
      className="flex min-h-[100svh] flex-col items-center justify-center gap-6 px-6 pt-20 text-center"
      initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] } }}
      exit={{ opacity: 0, y: -24, filter: "blur(8px)", transition: { duration: 0.35, ease: [0.7, 0, 0.84, 0] } }}
    >
      <h1 className="text-4xl font-bold md:text-6xl">Travel</h1>
      <p className="text-lg text-gray-300">Coming soon.</p>
      <Link to="/" className="text-blue-300 underline-offset-4 hover:underline">
        Back home
      </Link>
    </motion.section>
  );
}
