'use client';

import { useFilters } from '@/lib/filter-context';
import { DATE_PRESETS } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { formatDate } from '@/lib/helpers';

export function FilterBar() {
  const { datePreset, dateFrom, dateTo, includeVat, setDatePreset, setDateRange, setIncludeVat } = useFilters();

  return (
    <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <Label htmlFor="date-preset" className="text-sm font-medium text-zinc-400">
            Date Range
          </Label>
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger id="date-preset" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {datePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(dateFrom.toISOString())}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={(date) => date && setDateRange(date, dateTo)}
                />
              </PopoverContent>
            </Popover>
            <span className="text-zinc-500">to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDate(dateTo.toISOString())}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={(date) => date && setDateRange(dateFrom, date)}
                />
              </PopoverContent>
            </Popover>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="vat-toggle" className="text-sm font-medium text-zinc-400">
            VAT Included
          </Label>
          <Switch id="vat-toggle" checked={includeVat} onCheckedChange={setIncludeVat} />
        </div>
      </div>
    </div>
  );
}
