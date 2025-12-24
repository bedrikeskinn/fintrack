'use client';

import { useEffect, useState } from 'react';
import { useFilters } from '@/lib/filter-context';
import { supabase } from '@/lib/supabase';
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
import { Plus, Edit2, Trash2, DollarSign, Download } from 'lucide-react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/lib/constants';
import { formatCurrency, formatDate, fetchExchangeRate, calculateTotalWithVat, exportToCSV } from '@/lib/helpers';

type Income = {
  id: string;
  date: string;
  title: string;
  amount: number;
  vat_amount: number;
  currency: string;
  fx_rate_to_try: number | null;
  try_amount: number | null;
  linked_type: 'client' | 'project' | 'none';
  linked_client_id: string | null;
  linked_project_id: string | null;
  details: string | null;
  client?: { name: string };
  project?: { name: string };
};

type IncomeProps = {
  companyId: string;
  currency: string;
};

export function CompanyIncome({ companyId, currency }: IncomeProps) {
  const { dateFrom, dateTo, includeVat } = useFilters();
  const [income, setIncome] = useState<Income[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; preferred_currency: string }[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    amount: '',
    vat_amount: '0',
    currency: currency,
    fx_rate_to_try: '',
    linked_type: 'none' as 'client' | 'project' | 'none',
    linked_client_id: '',
    linked_project_id: '',
    details: '',
  });

  useEffect(() => {
    loadData();
  }, [companyId, dateFrom, dateTo]);

  useEffect(() => {
    if (formData.linked_type === 'client' && formData.linked_client_id && !editingIncome) {
      const selectedClient = clients.find(c => c.id === formData.linked_client_id);
      if (selectedClient && selectedClient.preferred_currency !== formData.currency) {
        const fetchRate = async () => {
          if (selectedClient.preferred_currency !== 'TRY') {
            const rate = await fetchExchangeRate(selectedClient.preferred_currency, 'TRY');
            if (rate) {
              setFormData(prev => ({
                ...prev,
                currency: selectedClient.preferred_currency,
                fx_rate_to_try: rate.toString()
              }));
            } else {
              setFormData(prev => ({ ...prev, currency: selectedClient.preferred_currency }));
            }
          } else {
            setFormData(prev => ({ ...prev, currency: selectedClient.preferred_currency, fx_rate_to_try: '' }));
          }
        };
        fetchRate();
      }
    }
  }, [formData.linked_client_id, formData.linked_type, clients, editingIncome]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [incomeData, clientsData, projectsData] = await Promise.all([
        supabase
          .from('income')
          .select('*, clients(name), projects(name)')
          .eq('company_id', companyId)
          .gte('date', dateFrom.toISOString().split('T')[0])
          .lte('date', dateTo.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase.from('clients').select('id, name, preferred_currency').eq('company_id', companyId),
        supabase.from('projects').select('id, name').eq('company_id', companyId),
      ]);

      if (incomeData.error) throw incomeData.error;
      if (clientsData.error) throw clientsData.error;
      if (projectsData.error) throw projectsData.error;

      setIncome(incomeData.data || []);
      setClients(clientsData.data || []);
      setProjects(projectsData.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load income');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (item?: Income) => {
    if (item) {
      setEditingIncome(item);
      setFormData({
        date: item.date,
        title: item.title,
        amount: item.amount.toString(),
        vat_amount: item.vat_amount.toString(),
        currency: item.currency,
        fx_rate_to_try: item.fx_rate_to_try?.toString() || '',
        linked_type: item.linked_type,
        linked_client_id: item.linked_client_id || '',
        linked_project_id: item.linked_project_id || '',
        details: item.details || '',
      });
    } else {
      setEditingIncome(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        title: '',
        amount: '',
        vat_amount: '0',
        currency: currency,
        fx_rate_to_try: '',
        linked_type: 'none',
        linked_client_id: '',
        linked_project_id: '',
        details: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setFormData({ ...formData, currency: newCurrency });
    if (newCurrency !== 'TRY' && formData.amount) {
      const rate = await fetchExchangeRate(newCurrency, 'TRY');
      if (rate) {
        setFormData((prev) => ({ ...prev, fx_rate_to_try: rate.toString() }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.linked_type === 'none' && !formData.details) {
      toast.error('Please provide details for unlinked income');
      return;
    }

    try {
      const amount = parseFloat(formData.amount);
      const vatAmount = parseFloat(formData.vat_amount) || 0;
      const fxRate = formData.fx_rate_to_try ? parseFloat(formData.fx_rate_to_try) : null;
      const tryAmount = fxRate ? amount * fxRate : null;

      const payload = {
        company_id: companyId,
        date: formData.date,
        title: formData.title,
        amount,
        vat_amount: vatAmount,
        currency: formData.currency,
        fx_rate_to_try: fxRate,
        try_amount: tryAmount,
        linked_type: formData.linked_type,
        linked_client_id: formData.linked_type === 'client' ? formData.linked_client_id || null : null,
        linked_project_id: formData.linked_type === 'project' ? formData.linked_project_id || null : null,
        details: formData.details || null,
      };

      if (editingIncome) {
        const { error } = await supabase
          .from('income')
          .update(payload)
          .eq('id', editingIncome.id);
        if (error) throw error;
        toast.success('Income updated successfully');
      } else {
        const { error } = await supabase.from('income').insert(payload);
        if (error) throw error;
        toast.success('Income recorded successfully');
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save income');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from('income').delete().eq('id', deleteConfirm);
      if (error) throw error;
      toast.success('Income deleted successfully');
      setDeleteConfirm(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete income');
    }
  };

  const handleExport = () => {
    const exportData = income.map((item) => ({
      Date: item.date,
      Title: item.title,
      Amount: item.amount,
      VAT: item.vat_amount,
      Currency: item.currency,
      'Total (with VAT)': calculateTotalWithVat(item.amount, item.vat_amount, true),
      'Linked To': item.linked_type === 'client' ? item.client?.name || '' : item.linked_type === 'project' ? item.project?.name || '' : 'Unlinked',
      Details: item.details || '',
    }));

    exportToCSV(exportData, `income-${companyId}-${Date.now()}.csv`);
    toast.success('Income exported to CSV');
  };

  const total = income.reduce((sum, item) => sum + calculateTotalWithVat(item.amount, item.vat_amount, includeVat), 0);

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Income</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Total: {formatCurrency(total, currency)} {includeVat ? '(VAT included)' : '(VAT excluded)'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2" disabled={income.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Income
          </Button>
        </div>
      </div>

      {income.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No income records yet"
          description="Add your first income record to track earnings"
          action={{ label: 'Add Income', onClick: () => openDialog() }}
        />
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Linked To</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {income.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{formatDate(item.date)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{item.title}</div>
                    {item.details && <div className="text-xs text-zinc-400 mt-1">{item.details}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.linked_type === 'client' && item.client && (
                      <div className="text-blue-400">Client: {item.client.name}</div>
                    )}
                    {item.linked_type === 'project' && item.project && (
                      <div className="text-green-400">Project: {item.project.name}</div>
                    )}
                    {item.linked_type === 'none' && <span className="text-zinc-500">Unlinked</span>}
                  </TableCell>
                  <TableCell>{formatCurrency(item.amount, item.currency)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(calculateTotalWithVat(item.amount, item.vat_amount, includeVat), item.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(item.id)}>
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
            <DialogTitle>{editingIncome ? 'Edit Income' : 'Add Income'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Payment from client"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat_amount">VAT Amount</Label>
                <Input
                  id="vat_amount"
                  type="number"
                  step="0.01"
                  value={formData.vat_amount}
                  onChange={(e) => setFormData({ ...formData, vat_amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.currency !== 'TRY' && (
              <div className="space-y-2">
                <Label htmlFor="fx_rate">FX Rate to TRY</Label>
                <Input
                  id="fx_rate"
                  type="number"
                  step="0.0001"
                  value={formData.fx_rate_to_try}
                  onChange={(e) => setFormData({ ...formData, fx_rate_to_try: e.target.value })}
                  placeholder="Exchange rate"
                />
                <p className="text-xs text-zinc-500">
                  Auto-fetched rate. You can edit it before saving.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="linked_type">Link To</Label>
              <Select value={formData.linked_type} onValueChange={(val: any) => setFormData({ ...formData, linked_type: val })}>
                <SelectTrigger id="linked_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unlinked</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.linked_type === 'client' && (
              <div className="space-y-2">
                <Label htmlFor="linked_client">Select Client</Label>
                <Select value={formData.linked_client_id} onValueChange={(val) => setFormData({ ...formData, linked_client_id: val })}>
                  <SelectTrigger id="linked_client">
                    <SelectValue placeholder="Choose a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.linked_type === 'project' && (
              <div className="space-y-2">
                <Label htmlFor="linked_project">Select Project</Label>
                <Select value={formData.linked_project_id} onValueChange={(val) => setFormData({ ...formData, linked_project_id: val })}>
                  <SelectTrigger id="linked_project">
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.linked_type === 'none' && (
              <div className="space-y-2">
                <Label htmlFor="details">Details (required for unlinked income)</Label>
                <Textarea
                  id="details"
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  placeholder="Describe the source of this income..."
                  rows={2}
                  required
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {editingIncome ? 'Update' : 'Create'}
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
        title="Delete Income"
        description="Are you sure you want to delete this income record? This action cannot be undone."
      />
    </div>
  );
}
