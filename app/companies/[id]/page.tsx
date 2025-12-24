'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/header';
import { FilterBar } from '@/components/filter-bar';
import { Loading } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { CompanyOverview } from '@/components/company/overview';
import { CompanyClients } from '@/components/company/clients';
import { CompanyProjects } from '@/components/company/projects';
import { CompanyIncome } from '@/components/company/income';
import { CompanyExpenses } from '@/components/company/expenses';

type Company = {
  id: string;
  name: string;
  description: string | null;
  default_currency: string;
};

export default function CompanyPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && params.id) {
      loadCompany();
    }
  }, [user, params.id]);

  const loadCompany = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', params.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        router.push('/dashboard');
        return;
      }

      setCompany(data);
    } catch (error) {
      console.error('Error loading company:', error);
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading || !company) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <FilterBar />
      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">{company.name}</h1>
              {company.description && (
                <p className="text-sm text-zinc-400 mt-1">{company.description}</p>
              )}
            </div>
          </div>
          <Link href={`/companies/${company.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CompanyOverview companyId={company.id} currency={company.default_currency} />
          </TabsContent>

          <TabsContent value="clients">
            <CompanyClients companyId={company.id} currency={company.default_currency} />
          </TabsContent>

          <TabsContent value="projects">
            <CompanyProjects companyId={company.id} />
          </TabsContent>

          <TabsContent value="income">
            <CompanyIncome companyId={company.id} currency={company.default_currency} />
          </TabsContent>

          <TabsContent value="expenses">
            <CompanyExpenses companyId={company.id} currency={company.default_currency} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
