/**
 * DataTable Component - Napredna tabela sa sortiranjem, filtriranjem i paginacijom
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Filter,
  MoreHorizontal,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

// Types
export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  pagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (row: T) => void;
  className?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  actions?: (row: T) => React.ReactNode;
  bulkActions?: React.ReactNode;
  exportable?: boolean;
  onExport?: () => void;
}

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyField,
  loading = false,
  emptyMessage = 'Nema podataka za prikaz',
  searchable = true,
  searchPlaceholder = 'Pretraži...',
  pagination = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  onRowClick,
  className,
  stickyHeader = false,
  striped = true,
  hoverable = true,
  compact = false,
  actions,
  bulkActions,
  exportable = false,
  onExport
}: DataTableProps<T>) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Filtering
  const filteredData = useMemo(() => {
    let result = [...data];

    // Global search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const value = getNestedValue(row, col.key as string);
          return String(value).toLowerCase().includes(query);
        })
      );
    }

    // Column filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter((row) => {
          const value = getNestedValue(row, key);
          return String(value).toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    return result;
  }, [data, searchQuery, columnFilters, columns]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return filteredData;
    }

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key);
      const bValue = getNestedValue(b, sortConfig.key);

      if (aValue === bValue) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handlers
  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' };
      }
      return { key: '', direction: null };
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!onSelectionChange) return;
    
    const allSelected = paginatedData.every((row) =>
      selectedRows.some((s) => s[keyField] === row[keyField])
    );

    if (allSelected) {
      onSelectionChange(
        selectedRows.filter((s) => !paginatedData.some((r) => r[keyField] === s[keyField]))
      );
    } else {
      const newSelections = paginatedData.filter(
        (row) => !selectedRows.some((s) => s[keyField] === row[keyField])
      );
      onSelectionChange([...selectedRows, ...newSelections]);
    }
  }, [paginatedData, selectedRows, keyField, onSelectionChange]);

  const handleSelectRow = useCallback((row: T) => {
    if (!onSelectionChange) return;
    
    const isSelected = selectedRows.some((s) => s[keyField] === row[keyField]);
    if (isSelected) {
      onSelectionChange(selectedRows.filter((s) => s[keyField] !== row[keyField]));
    } else {
      onSelectionChange([...selectedRows, row]);
    }
  }, [selectedRows, keyField, onSelectionChange]);

  const isAllSelected = paginatedData.length > 0 && 
    paginatedData.every((row) => selectedRows.some((s) => s[keyField] === row[keyField]));

  const isSomeSelected = selectedRows.length > 0 && !isAllSelected;

  // Render sort icon
  const renderSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 text-blue-600" />
    );
  };

  return (
    <div className={cn('bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700', className)}>
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg
                       bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {columns.some((c) => c.filterable) && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors',
                showFilters
                  ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              )}
            >
              <Filter className="w-4 h-4" />
              Filteri
              {Object.values(columnFilters).filter(Boolean).length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {Object.values(columnFilters).filter(Boolean).length}
                </span>
              )}
            </button>
          )}

          {exportable && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 
                       rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Izvezi
            </button>
          )}

          {selectable && selectedRows.length > 0 && bulkActions && (
            <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedRows.length} odabrano
              </span>
              {bulkActions}
            </div>
          )}
        </div>
      </div>

      {/* Column Filters */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-wrap gap-4">
            {columns
              .filter((c) => c.filterable)
              .map((col) => (
                <div key={String(col.key)} className="flex-1 min-w-[150px] max-w-[250px]">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {col.header}
                  </label>
                  <input
                    type="text"
                    placeholder={`Filtriraj ${col.header.toLowerCase()}...`}
                    value={columnFilters[String(col.key)] || ''}
                    onChange={(e) => {
                      setColumnFilters((prev) => ({ ...prev, [String(col.key)]: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded
                             bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            <button
              onClick={() => setColumnFilters({})}
              className="self-end px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400"
            >
              Resetuj
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={cn(
            'bg-gray-50 dark:bg-gray-800',
            stickyHeader && 'sticky top-0 z-10'
          )}>
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider',
                    compact ? 'py-2' : 'py-3',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-white',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.className
                  )}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    col.align === 'center' && 'justify-center',
                    col.align === 'right' && 'justify-end'
                  )}>
                    {col.header}
                    {col.sortable && renderSortIcon(String(col.key))}
                  </div>
                </th>
              ))}
              {actions && <th className="w-10 px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              // Loading skeleton
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={i}>
                  {selectable && (
                    <td className="px-4 py-3">
                      <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  )}
                  {columns.map((col, j) => (
                    <td key={j} className={cn('px-4', compact ? 'py-2' : 'py-3')}>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3">
                      <div className="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-4 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const isSelected = selectedRows.some((s) => s[keyField] === row[keyField]);
                return (
                  <tr
                    key={String(row[keyField])}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      striped && rowIndex % 2 === 1 && 'bg-gray-50 dark:bg-gray-800/50',
                      hoverable && 'hover:bg-blue-50 dark:hover:bg-blue-900/10',
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-blue-50 dark:bg-blue-900/20'
                    )}
                  >
                    {selectable && (
                      <td className="px-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(row)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={cn(
                          'px-4 text-sm text-gray-900 dark:text-gray-100',
                          compact ? 'py-2' : 'py-3',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.className
                        )}
                      >
                        {col.render
                          ? col.render(row, rowIndex)
                          : String(getNestedValue(row, String(col.key)) ?? '')}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4" onClick={(e) => e.stopPropagation()}>
                        {actions(row)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && sortedData.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>Prikaži</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>od {sortedData.length} rezultata</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <ChevronLeft className="w-4 h-4 -ml-2" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 px-2">
              {generatePageNumbers(currentPage, totalPages).map((page, i) =>
                page === '...' ? (
                  <span key={i} className="px-2 text-gray-400">...</span>
                ) : (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(page as number)}
                    className={cn(
                      'w-8 h-8 rounded text-sm font-medium transition-colors',
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
              <ChevronRight className="w-4 h-4 -ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get nested object values
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

// Generate page numbers with ellipsis
function generatePageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  
  if (current <= 3) {
    pages.push(1, 2, 3, 4, '...', total);
  } else if (current >= total - 2) {
    pages.push(1, '...', total - 3, total - 2, total - 1, total);
  } else {
    pages.push(1, '...', current - 1, current, current + 1, '...', total);
  }

  return pages;
}

export default DataTable;
