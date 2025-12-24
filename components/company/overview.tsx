'use client';

import { useEffect, useState } from 'react';
import { useFilters } from '@/lib/filter-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, calculateTotalWithVat } from '@/lib/helpers';
import { TrendingUp, TrendingDown, Wallet, Users, Briefcase } from 'lucide-react';
import { Loading } from '@/components/loading';

type OverviewProps = {
  companyId: string;
  currency: string;
};

export function CompanyOverview({ companyId, currency }: OverviewProps) {
  const { dateFrom, dateTo, includeVat } = useFilters();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    income: 0,
    expenses: 0,
    net: 0,
    clientCount: 0,
    projectCount: 0,
  });

  useEffect(() => {
    loadStats();
  }, [companyId, dateFrom, dateTo, includeVat]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [incomeData, expenseData, clientData, projectData] = await Promise.all([
        supabase
          .from('income')
          .select('amount, vat_amount')
          .eq('company_id', companyId)
          .gte('date', dateFrom.toISOString().split('T')[0])
          .lte('date', dateTo.toISOString().split('T')[0]),
        supabase
          .from('expenses')
          .select('amount, vat_amount')
          .eq('company_id', companyId)
          .eq('scope', 'company')
          .gte('date', dateFrom.toISOString().split('T')[0])
          .lte('date', dateTo.toISOString().split('T')[0]),
        supabase
          .from('clients')
          .select('id')
          .eq('company_id', companyId),
        supabase
          .from('projects')
          .select('id')
          .eq('company_id', companyId),
      ]);

      const income = incomeData.data?.reduce(
        (sum, record) => sum + calculateTotalWithVat(record.amount, record.vat_amount || 0, includeVat),
        0
      ) || 0;

      const expenses = expenseData.data?.reduce(
        (sum, record) => sum + calculateTotalWithVat(record.amount, record.vat_amount || 0, includeVat),
        0
      ) || 0;

      setStats({
        income,
        expenses,
        net: income - expenses,
        clientCount: clientData.data?.length || 0,
        projectCount: projectData.data?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(stats.income, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(stats.expenses, currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Net</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.net >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatCurrency(stats.net, currency)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{stats.clientCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">{stats.projectCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
