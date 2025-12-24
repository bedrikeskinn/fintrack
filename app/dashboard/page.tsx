'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useFilters } from '@/lib/filter-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/header';
import { FilterBar } from '@/components/filter-bar';
import { Loading } from '@/components/loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, calculateTotalWithVat } from '@/lib/helpers';
import { Plus, Building2, User, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import Link from 'next/link';

type CompanyStats = {
  id: string;
  name: string;
  currency: string;
  income: number;
  expenses: number;
  net: number;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { dateFrom, dateTo, includeVat } = useFilters();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyStats[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, dateFrom, dateTo, includeVat]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (!companiesData) {
        setCompanies([]);
        setLoading(false);
        return;
      }

      const stats: CompanyStats[] = [];
      let globalIncome = 0;
      let globalExpenses = 0;

      for (const company of companiesData) {
        const { data: incomeData } = await supabase
          .from('income')
          .select('amount, vat_amount')
          .eq('company_id', company.id)
          .gte('date', dateFrom.toISOString().split('T')[0])
          .lte('date', dateTo.toISOString().split('T')[0]);

        const { data: expenseData } = await supabase
          .from('expenses')
          .select('amount, vat_amount')
          .eq('company_id', company.id)
          .eq('scope', 'company')
          .gte('date', dateFrom.toISOString().split('T')[0])
          .lte('date', dateTo.toISOString().split('T')[0]);

        const income = incomeData?.reduce(
          (sum, record) => sum + calculateTotalWithVat(record.amount, record.vat_amount || 0, includeVat),
          0
        ) || 0;

        const expenses = expenseData?.reduce(
          (sum, record) => sum + calculateTotalWithVat(record.amount, record.vat_amount || 0, includeVat),
          0
        ) || 0;

        stats.push({
          id: company.id,
          name: company.name,
          currency: company.default_currency,
          income,
          expenses,
          net: income - expenses,
        });

        globalIncome += income;
        globalExpenses += expenses;
      }

      const { data: personalExpenseData } = await supabase
        .from('expenses')
        .select('amount, vat_amount')
        .eq('scope', 'personal')
        .gte('date', dateFrom.toISOString().split('T')[0])
        .lte('date', dateTo.toISOString().split('T')[0]);

      const personalExpenses = personalExpenseData?.reduce(
        (sum, record) => sum + calculateTotalWithVat(record.amount, record.vat_amount || 0, includeVat),
        0
      ) || 0;

      globalExpenses += personalExpenses;

      setCompanies(stats);
      setTotalIncome(globalIncome);
      setTotalExpenses(globalExpenses);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return <Loading />;
  }

  const totalNet = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <FilterBar />
      <main className="p-6 max-w-7xl mx-auto">
        {loading ? (
          <Loading />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Income</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {formatCurrency(totalIncome, 'USD')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Total Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {formatCurrency(totalExpenses, 'USD')}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Net</CardTitle>
                  <Wallet className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${totalNet >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                    {formatCurrency(totalNet, 'USD')}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-100">Companies</h2>
              <Link href="/companies/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Company
                </Button>
              </Link>
            </div>

            {companies.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="h-12 w-12 text-zinc-600 mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">No companies yet</h3>
                  <p className="text-sm text-zinc-500 mb-4">Create your first company to start tracking finances</p>
                  <Link href="/companies/new">
                    <Button>Create Company</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companies.map((company) => (
                  <Link key={company.id} href={`/companies/${company.id}`}>
                    <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
                      <CardHeader>
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Income</span>
                          <span className="text-green-500 font-medium">
                            {formatCurrency(company.income, company.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-zinc-400">Expenses</span>
                          <span className="text-red-500 font-medium">
                            {formatCurrency(company.expenses, company.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-zinc-800">
                          <span className="text-zinc-400 font-medium">Net</span>
                          <span className={`font-bold ${company.net >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                            {formatCurrency(company.net, company.currency)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            <div className="flex gap-4">
              <Link href="/personal" className="flex-1">
                <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Finances
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-400">View and manage your personal income and expenses</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
