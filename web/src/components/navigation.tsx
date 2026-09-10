"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { chapters } from "@/lib/sections";
export function Navigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="masthead">
        <Link href="/" className="wordmark">
          Investment research
          <span>Quantitative Investment & Risk Analysis</span>
        </Link>
        <a
          className="repository-link"
          href="https://github.com/Zaiys/quant-investment-risk-dashboard"
          target="_blank"
          rel="noreferrer"
        >
          Source repository <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div className="contents-bar">
        <span className="meta-label">Research contents</span>
        <button
          className="contents-toggle"
          aria-expanded={open}
          aria-controls="research-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? "Close contents" : "Browse chapters"}{" "}
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      </div>
      <nav
        id="research-navigation"
        aria-label="Research chapters"
        className={`chapter-nav ${open ? "is-open" : ""}`}
      >
        {chapters.map((chapter) => (
          <Link
            key={chapter.href}
            href={chapter.href}
            aria-current={pathname === chapter.href ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <span className="chapter-number">{chapter.number}</span>
            <span>{chapter.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}
