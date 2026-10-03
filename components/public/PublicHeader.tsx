"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useFormReady } from "@/components/member/useFormReady";
import type { PublicNavigationItem } from "@/lib/page-builder/publicPages";
export const publicNavigation = [
  ["Projects", "/projects"],
  ["Events", "/events"],
  ["3-2 Pathway", "/pathway"],
  ["About", "/about"],
  ["Leadership", "/leadership"],
  ["Resources", "/resources"],
  ["Opportunities", "/opportunities"],
  ["News", "/news"],
  ["Member sign in", "/member/login"],
  ["Join the club", "/get-involved"],
] as const;
const primaryDestinations = ["/projects", "/events", "/pathway", "/about"];
const essentialNavigation: PublicNavigationItem[] = [
  { label: "Join the club", destination: "/get-involved" },
  { label: "Leadership", destination: "/leadership" },
  { label: "Member sign in", destination: "/member/login" },
];

export function PublicHeader({
  items,
  logoSrc,
}: {
  items?: PublicNavigationItem[];
  logoSrc?: string | null;
}) {
  const nav: PublicNavigationItem[] = items?.length
    ? items
    : publicNavigation.map(([label, destination]) => ({ label, destination }));
  const pathname = usePathname();
  const ready = useFormReady();
  const [menu, setMenu] = useState({ pathname, open: false });
  // Discard the open state on a route change, including before returning here.
  if (menu.pathname !== pathname) {
    setMenu({ pathname, open: false });
  }
  const open = menu.pathname === pathname && menu.open;
  const closeNavigation = () => setMenu({ pathname, open: false });
  const trigger = useRef<HTMLButtonElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const completeNavigation = [
    ...nav,
    ...essentialNavigation.filter(
      (essential) =>
        !nav.some(
          (item) => !item.external && item.destination === essential.destination,
        ),
    ),
  ];
  const primary = completeNavigation.filter(
    (item) => !item.external && primaryDestinations.includes(item.destination),
  );
  const other = completeNavigation.filter(
    (item) => item.external || !primaryDestinations.includes(item.destination),
  );
  useEffect(() => {
    if (!open) return;
    navigation.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const dismiss = () => setMenu({ pathname, open: false });
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        dismiss();
        trigger.current?.focus();
      }
    }
    function outside(event: PointerEvent | FocusEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !navigation.current?.contains(target) &&
        !trigger.current?.contains(target)
      ) {
        dismiss();
      }
    }
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    window.addEventListener("popstate", dismiss);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      window.removeEventListener("popstate", dismiss);
    };
  }, [open, pathname]);
  const itemLink = (item: PublicNavigationItem, index: number) => {
    const destinationPath = item.destination.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
    const isCurrent =
      !item.external &&
      item.destination.startsWith("/") &&
      !item.destination.startsWith("//") &&
      (pathname === destinationPath ||
        (destinationPath !== "/" && pathname?.startsWith(destinationPath + "/")));
    return (
      <Link
        key={item.id ?? `${item.destination}:${index}`}
        href={item.destination}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noreferrer" : undefined}
        aria-current={isCurrent ? "page" : undefined}
        onClick={closeNavigation}
      >
        {item.label}
        <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    );
  };
  return (
    <header className="public-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="shell public-header__inner">
        <Link
          href="/"
          className="public-header__brand"
          aria-label="Makers and Engineers @Oberlin home"
          onClick={closeNavigation}
        >
          <BrandLogo variant="badge" src={logoSrc} />
          <span>
            Makers and Engineers<small>@Oberlin</small>
          </span>
        </Link>
        <nav className="desktop-primary" aria-label="Primary navigation">
          {primary.map(itemLink)}
        </nav>
        <div className="header-actions">
          <Link className="header-app" href="/app" onClick={closeNavigation}>
            Get the app
          </Link>
          <Link
            className="header-member"
            href="/member/login"
            onClick={closeNavigation}
          >
            Member sign in
          </Link>
          <Link
            className="header-join"
            href="/get-involved"
            onClick={closeNavigation}
          >
            Join the club <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <button
            ref={trigger}
            className="public-menu"
            type="button"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="expanded-navigation"
            disabled={!ready}
            onClick={() => setMenu({ pathname, open: !open })}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          ref={navigation}
          id="expanded-navigation"
          className="expanded-navigation"
          aria-label="All pages"
        >
          <div className="shell expanded-navigation__grid">
            <div>{primary.map(itemLink)}</div>
            <div>{other.map(itemLink)}</div>
          </div>
        </nav>
      )}
    </header>
  );
}
