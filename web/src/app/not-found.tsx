import Link from "next/link";
export default function NotFound() {
  return (
    <section className="not-found">
      <span className="meta-label">404 / Research index</span>
      <h1>This chapter is not available.</h1>
      <p>Use the contents to return to the study.</p>
      <Link href="/" className="text-link">
        Research overview →
      </Link>
    </section>
  );
}
