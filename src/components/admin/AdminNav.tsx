'use client';

import {
  BookOpen,
  CalendarClock,
  Inbox,
  LayoutDashboard,
  LineChart,
  Mail,
  Newspaper,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Admin.module.css';

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: 'demandes' | 'leads';
}

const GROUPS: Array<{ title: string; items: Item[] }> = [
  {
    title: 'Piloter',
    items: [
      { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
      { href: '/admin/statistiques', label: 'Statistiques & visibilité', icon: LineChart },
    ],
  },
  {
    title: 'Relation client',
    items: [
      { href: '/admin/clients', label: 'Clients', icon: Users },
      { href: '/admin/demandes', label: 'Demandes', icon: Inbox, badge: 'demandes' },
      { href: '/admin/leads', label: 'Leads & rendez-vous', icon: CalendarClock, badge: 'leads' },
      { href: '/admin/nurturing', label: 'Nurturing', icon: Mail },
    ],
  },
  {
    title: 'Contenu',
    items: [{ href: '/admin/blog', label: 'Blog', icon: Newspaper }],
  },
  {
    title: 'Système',
    items: [
      { href: '/admin/reglages', label: 'Santé & réglages', icon: ShieldCheck },
      { href: '/admin/aide', label: 'Aide & glossaire', icon: BookOpen },
    ],
  },
];

export function AdminNav({
  badges,
  onNavigate,
}: {
  badges: { demandes: number; leads: number };
  onNavigate?: () => void;
}) {
  const path = usePathname();
  const active = (href: string) => (href === '/admin' ? path === '/admin' : path.startsWith(href));
  return (
    <nav className={styles.nav} aria-label="Navigation de l'administration">
      {GROUPS.map((g) => (
        <div key={g.title} style={{ display: 'contents' }}>
          <p className={styles.group}>{g.title}</p>
          {g.items.map(({ href, label, icon: Icon, badge }) => (
            <Link
              key={href}
              href={href}
              className={styles.link}
              aria-current={active(href) ? 'page' : undefined}
              onClick={onNavigate}
            >
              <Icon size={19} aria-hidden="true" />
              {label}
              {badge && badges[badge] > 0 ? (
                <span className={styles.badge} aria-label={`${badges[badge]} à traiter`}>
                  {badges[badge]}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
