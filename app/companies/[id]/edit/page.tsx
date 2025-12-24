'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Loading } from '@/components/loading';
import { CURRENCIES } from '@/lib/constants';
import { toast } from 'sonner';
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

type Company = {
  id: string;
  name: string;
  description: string | null;
  default_currency: string;
};

export default function EditCompanyPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

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
        toast.error('Company not found');
        router.push('/dashboard');
        return;
      }

      setCompany(data);
      setName(data.name);
      setDescription(data.description || '');
      setCurrency(data.default_currency);
    } catch (error) {
      console.error('Error loading company:', error);
      toast.error('Failed to load company');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name,
          description: description || null,
          default_currency: currency,
        })
        .eq('id', company.id);

      if (error) throw error;

      toast.success('Company updated successfully');
      router.push(`/companies/${company.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update company');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!company) return;

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);

      if (error) throw error;

      toast.success('Company deleted successfully');
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete company');
    }
  };

  if (authLoading || loading || !company) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <main className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href={`/companies/${company.id}`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Company
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme Inc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A brief description of your company..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href={`/companies/${company.id}`} className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>

            <div className="pt-6 border-t border-zinc-800">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-100">Danger Zone</h3>
                <p className="text-sm text-zinc-400">
                  Deleting this company will also delete all associated clients, projects, income
                  records, and expenses. This action cannot be undone.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(true)}
                  className="gap-2 border-red-800 text-red-500 hover:bg-red-950 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Company
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <ConfirmationModal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Company"
        description={`Are you sure you want to delete "${company.name}"? This will permanently delete all associated clients, projects, income, and expenses. This action cannot be undone.`}
      />
    </div>
  );
}
