"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  ChartNoAxesCombined,
  Compass,
  FlaskConical,
  Layers,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { sections } from "@/lib/sections";
const icons = [Compass, ChartNoAxesCombined, Layers, ShieldCheck, Activity];
export function Navigation() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="Quant Research overview">
        <span className="brand-symbol">
          <ChartNoAxesCombined size={23} />
        </span>
        <span>
          QUANT<span className="brand-sub">RESEARCH / RISK</span>
        </span>
      </Link>
      <div className="sidebar-label">RESEARCH WORKSPACE</div>
      <nav aria-label="Main navigation">
        <Link
          href="/"
          className={`nav-link ${pathname === "/" ? "active" : ""}`}
          aria-current={pathname === "/" ? "page" : undefined}
        >
          <LayoutDashboard size={18} />
          <span>Overview</span>
        </Link>
        {sections.map((section, index) => {
          const Icon = icons[index];
          const active = pathname === `/${section.key}`;
          return (
            <Link
              href={`/${section.key}`}
              key={section.key}
              className={`nav-link ${active ? "active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{section.title}</span>
              {section.key === "momentum" && (
                <span className="nav-tag">SOON</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <FlaskConical size={20} />
        <strong>Research, with context.</strong>
        <p>Trace every result to its underlying analysis.</p>
        <a
          href="https://github.com/Zaiys/quant-investment-risk-dashboard"
          target="_blank"
          rel="noreferrer"
        >
          Project repository <ArrowUpRight size={15} />
        </a>
      </div>
      <div className="sidebar-footer">QUANTITATIVE INVESTMENT RESEARCH</div>
    </aside>
  );
}
