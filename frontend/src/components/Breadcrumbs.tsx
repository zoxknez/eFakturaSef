// Breadcrumbs navigation component
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

// Auto-generate breadcrumbs from URL
function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  // Map routes to labels
  const routeLabels: Record<string, string> = {
    invoices: 'Fakture',
    new: 'Nova faktura',
    settings: 'Podešavanja',
    dashboard: 'Kontrolna tabla',
    company: 'Kompanija',
    users: 'Korisnici',
  };

  paths.forEach((path, index) => {
    const href = '/' + paths.slice(0, index + 1).join('/');
    const label = routeLabels[path] || path;

    // Skip UUIDs
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path)) {
      breadcrumbs.push({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        href,
      });
    }
  });

  return breadcrumbs;
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const location = useLocation();
  const breadcrumbs = items || generateBreadcrumbs(location.pathname);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4" aria-label="Breadcrumb">
      <Link
        to="/"
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label="Početna"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {isLast || !item.href ? (
              <span className="font-medium text-gray-900 dark:text-gray-100" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}



