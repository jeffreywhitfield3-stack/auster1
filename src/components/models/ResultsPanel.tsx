// src/components/models/ResultsPanel.tsx
'use client';

import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ModelOutput } from '@/types/models';

interface ResultsPanelProps {
  output: ModelOutput;
  runId?: string;
  onPublish?: () => void;
}

export default function ResultsPanel({ output, runId, onPublish }: ResultsPanelProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Results</h2>

        {runId && onPublish && (
          <button
            onClick={onPublish}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Publish
          </button>
        )}
      </div>

      {/* Metadata */}
      {output.metadata && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p>
            <strong>Computed:</strong>{' '}
            {new Date(output.metadata.computed_at).toLocaleString()}
          </p>
          {output.metadata.data_sources && output.metadata.data_sources.length > 0 && (
            <p>
              <strong>Data sources:</strong> {output.metadata.data_sources.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Warnings */}
      {output.metadata?.warnings && output.metadata.warnings.length > 0 && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
          <ul className="text-sm text-yellow-700 list-disc list-inside">
            {output.metadata.warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scalars */}
      {output.scalars && Object.keys(output.scalars).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(output.scalars).map(([key, value]) => (
              <div key={key} className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {typeof value === 'number'
                    ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Series (Charts) */}
      {output.series && output.series.length > 0 && (
        <div className="mb-6 space-y-6">
          {output.series.map((series) => {
            const chartData = series.data.map((value, index) => ({
              index,
              value,
            }));

            const chartType = series.type || 'line';

            return (
              <div key={series.id}>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  {series.label}
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' && (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="index" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={series.color || '#2563eb'}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    )}
                    {chartType === 'bar' && (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="index" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill={series.color || '#2563eb'} />
                      </BarChart>
                    )}
                    {chartType === 'area' && (
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="index" />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={series.color || '#2563eb'}
                          fill={series.color || '#2563eb'}
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tables */}
      {output.tables && output.tables.length > 0 && (
        <div className="space-y-6">
          {output.tables.map((table) => (
            <div key={table.id}>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                {table.label}
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {table.columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {table.columns.map((col) => (
                          <td
                            key={col.key}
                            className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap"
                          >
                            {typeof row[col.key] === 'number'
                              ? row[col.key].toLocaleString(undefined, {
                                  maximumFractionDigits: 4,
                                })
                              : row[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!output.series &&
        !output.tables &&
        (!output.scalars || Object.keys(output.scalars).length === 0) && (
          <div className="text-center py-12 text-gray-500">
            <p>No output data available</p>
          </div>
        )}
    </div>
  );
}
