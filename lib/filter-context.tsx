'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { getDateRangeForPreset } from './helpers';

type FilterContextType = {
  datePreset: string;
  dateFrom: Date;
  dateTo: Date;
  includeVat: boolean;
  setDatePreset: (preset: string) => void;
  setDateRange: (from: Date, to: Date) => void;
  setIncludeVat: (include: boolean) => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [datePreset, setDatePresetState] = useState('this-month');
  const [includeVat, setIncludeVat] = useState(true);

  const initialRange = getDateRangeForPreset('this-month');
  const [dateFrom, setDateFrom] = useState(initialRange.from);
  const [dateTo, setDateTo] = useState(initialRange.to);

  const setDatePreset = (preset: string) => {
    setDatePresetState(preset);
    if (preset !== 'custom') {
      const range = getDateRangeForPreset(preset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  };

  const setDateRange = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
    setDatePresetState('custom');
  };

  return (
    <FilterContext.Provider
      value={{
        datePreset,
        dateFrom,
        dateTo,
        includeVat,
        setDatePreset,
        setDateRange,
        setIncludeVat,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
}
