'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFilters } from '@/lib/filter-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { EmptyState } from '@/components/empty-state';
import { Loading } from '@/components/loading';
import { Plus, Edit2, Trash2, Users, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_CATEGORIES, CURRENCIES } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency, calculateTotalWithVat } from '@/lib/helpers';

type Client = {
  id: string;
  name: string;
  website: string | null;
  monthly_budget: number | null;
  contract_months: number | null;
  vat_amount: number | null;
  payment_method: string | null;
  services: string[];
  notes: string | null;
  preferred_currency: string;
  total_income?: number;
};

type ClientsProps = {
  companyId: string;
  currency: string;
};

export function CompanyClients({ companyId, currency }: ClientsProps) {
  const { dateFrom, dateTo, includeVat } = useFilters();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    monthly_budget: '',
    contract_months: '',
    vat_amount: '',
    payment_method: '',
    preferred_currency: currency,
    services: [] as string[],
    notes: '',
  });

  useEffect(() => {
    loadClients();
  }, [companyId, dateFrom, dateTo, includeVat]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const clientsWithIncome = await Promise.all(
        (data || []).map(async (client) => {
          const { data: incomeData } = await supabase
            .from('income')
            .select('amount, vat_amount, currency')
            .eq('linked_client_id', client.id)
            .eq('linked_type', 'client')
            .gte('date', dateFrom.toISOString().split('T')[0])
            .lte('date', dateTo.toISOString().split('T')[0]);

          const totalIncome = incomeData
            ?.filter(record => record.currency === client.preferred_currency)
            .reduce((sum, record) => sum + calculateTotalWithVat(record.amount, record.vat_amount || 0, includeVat), 0) || 0;

          return {
            ...client,
            total_income: totalIncome,
          };
        })
      );

      setClients(clientsWithIncome);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        website: client.website || '',
        monthly_budget: client.monthly_budget?.toString() || '',
        contract_months: client.contract_months?.toString() || '',
        vat_amount: client.vat_amount?.toString() || '',
        payment_method: client.payment_method || '',
        preferred_currency: client.preferred_currency,
        services: client.services || [],
        notes: client.notes || '',
      });
    } else {
      setEditingClient(null);
      setFormData({
        name: '',
        website: '',
        monthly_budget: '',
        contract_months: '',
        vat_amount: '',
        payment_method: '',
        preferred_currency: currency,
        services: [],
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        company_id: companyId,
        name: formData.name,
        website: formData.website || null,
        monthly_budget: formData.monthly_budget ? parseFloat(formData.monthly_budget) : null,
        contract_months: formData.contract_months ? parseInt(formData.contract_months) : null,
        vat_amount: formData.vat_amount ? parseFloat(formData.vat_amount) : null,
        payment_method: formData.payment_method || null,
        preferred_currency: formData.preferred_currency,
        services: formData.services,
        notes: formData.notes || null,
      };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', editingClient.id);
        if (error) throw error;
        toast.success('Client updated successfully');
      } else {
        const { error } = await supabase.from('clients').insert(payload);
        if (error) throw error;
        toast.success('Client created successfully');
      }

      setDialogOpen(false);
      loadClients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save client');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from('clients').delete().eq('id', deleteConfirm);
      if (error) throw error;
      toast.success('Client deleted successfully');
      setDeleteConfirm(null);
      loadClients();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete client');
    }
  };

  const toggleService = (service: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((s) => s !== service)
        : [...prev.services, service],
    }));
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-zinc-100">Clients</h2>
        <Button onClick={() => openDialog()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to start tracking their projects and income"
          action={{ label: 'Add Client', onClick: () => openDialog() }}
        />
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Total Income</TableHead>
                <TableHead>Services</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{client.name}</div>
                      {client.website && (
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1"
                        >
                          {client.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-zinc-300">
                      {client.preferred_currency}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.monthly_budget ? formatCurrency(client.monthly_budget, client.preferred_currency) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-green-500">
                      {formatCurrency(client.total_income || 0, client.preferred_currency)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-zinc-400">
                      {client.services.length > 0 ? `${client.services.length} services` : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(client)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(client.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client' : 'Add Client'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Payment Method</Label>
                <Input
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  placeholder="Bank Transfer, PayPal, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_currency">Preferred Currency</Label>
                <Select value={formData.preferred_currency} onValueChange={(val) => setFormData({ ...formData, preferred_currency: val })}>
                  <SelectTrigger id="preferred_currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.value} - {curr.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_budget">Monthly Budget</Label>
                <Input
                  id="monthly_budget"
                  type="number"
                  step="0.01"
                  value={formData.monthly_budget}
                  onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_months">Contract (months)</Label>
                <Input
                  id="contract_months"
                  type="number"
                  value={formData.contract_months}
                  onChange={(e) => setFormData({ ...formData, contract_months: e.target.value })}
                  placeholder="12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat_amount">Default VAT Amount</Label>
                <Input
                  id="vat_amount"
                  type="number"
                  step="0.01"
                  value={formData.vat_amount}
                  onChange={(e) => setFormData({ ...formData, vat_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Services</Label>
              <div className="grid grid-cols-2 gap-3 border border-zinc-800 rounded-lg p-4">
                {SERVICE_CATEGORIES.map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={`service-${service}`}
                      checked={formData.services.includes(service)}
                      onCheckedChange={() => toggleService(service)}
                    />
                    <Label
                      htmlFor={`service-${service}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {service}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {editingClient ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone. Projects linked to this client will not be deleted."
      />
    </div>
  );
}
