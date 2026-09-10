import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-panel">
      <div className="eyebrow">404 / PAGE NOT FOUND</div>
      <h1>This view doesn’t exist.</h1>
      <p>Return to the research overview to find an analysis section.</p>
      <Link className="primary-link" href="/">
        Back to overview
      </Link>
    </div>
  );
}
