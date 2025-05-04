import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
}

export function DataTable<T extends object>({ data, columns }: DataTableProps<T>) {
  return (
    <div className="w-full overflow-auto">
      <table className="min-w-full divide-y divide-border-default">
        <thead className="bg-background">
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className="px-4 py-2 text-left text-sm font-medium text-text-muted"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default bg-white">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="transition-colors hover:bg-primary-light/10">
              {columns.map((col) => (
                <td key={col.header} className="px-4 py-2 text-sm text-text-base">
                  {col.render ? col.render(row) : String(row[col.accessor])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
