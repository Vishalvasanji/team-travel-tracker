"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Away Games" },
  { href: "/hotels", label: "Roster & Hotels" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="site-nav">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={pathname === href ? "nav-link active" : "nav-link"}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
