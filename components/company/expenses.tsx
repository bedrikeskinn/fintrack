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
import { Plus, Edit2, Trash2, CreditCard, Download } from 'lucide-react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/lib/constants';
import { formatCurrency, formatDate, fetchExchangeRate, calculateTotalWithVat, exportToCSV } from '@/lib/helpers';
import { useAuth } from '@/lib/auth-context';

type Expense = {
  id: string;
  date: string;
  title: string;
  amount: number;
  vat_amount: number;
  currency: string;
  fx_rate_to_try: number | null;
  try_amount: number | null;
  expense_category: string | null;
  notes: string | null;
};

type ExpensesProps = {
  companyId: string;
  currency: string;
};

export function CompanyExpenses({ companyId, currency }: ExpensesProps) {
  const { user } = useAuth();
  const { dateFrom, dateTo, includeVat } = useFilters();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    amount: '',
    vat_amount: '0',
    currency: currency,
    fx_rate_to_try: '',
    expense_category: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [companyId, dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expensesData, categoriesData] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .eq('company_id', companyId)
          .eq('scope', 'company')
          .gte('date', dateFrom.toISOString().split('T')[0])
          .lte('date', dateTo.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase.from('expense_categories').select('name').order('name'),
      ]);

      if (expensesData.error) throw expensesData.error;
      if (categoriesData.error) throw categoriesData.error;

      setExpenses(expensesData.data || []);
      setCategories(categoriesData.data?.map((c) => c.name) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        date: expense.date,
        title: expense.title,
        amount: expense.amount.toString(),
        vat_amount: expense.vat_amount.toString(),
        currency: expense.currency,
        fx_rate_to_try: expense.fx_rate_to_try?.toString() || '',
        expense_category: expense.expense_category || '',
        notes: expense.notes || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        title: '',
        amount: '',
        vat_amount: '0',
        currency: currency,
        fx_rate_to_try: '',
        expense_category: '',
        notes: '',
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
    if (!user) return;

    try {
      const amount = parseFloat(formData.amount);
      const vatAmount = parseFloat(formData.vat_amount) || 0;
      const fxRate = formData.fx_rate_to_try ? parseFloat(formData.fx_rate_to_try) : null;
      const tryAmount = fxRate ? amount * fxRate : null;

      const payload = {
        user_id: user.id,
        scope: 'company' as const,
        company_id: companyId,
        date: formData.date,
        title: formData.title,
        amount,
        vat_amount: vatAmount,
        currency: formData.currency,
        fx_rate_to_try: fxRate,
        try_amount: tryAmount,
        expense_category: formData.expense_category || null,
        notes: formData.notes || null,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingExpense.id);
        if (error) throw error;
        toast.success('Expense updated successfully');
      } else {
        const { error } = await supabase.from('expenses').insert(payload);
        if (error) throw error;
        toast.success('Expense recorded successfully');
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save expense');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', deleteConfirm);
      if (error) throw error;
      toast.success('Expense deleted successfully');
      setDeleteConfirm(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete expense');
    }
  };

  const handleExport = () => {
    const exportData = expenses.map((item) => ({
      Date: item.date,
      Title: item.title,
      Category: item.expense_category || 'Uncategorized',
      Amount: item.amount,
      VAT: item.vat_amount,
      Currency: item.currency,
      'Total (with VAT)': calculateTotalWithVat(item.amount, item.vat_amount, true),
      Notes: item.notes || '',
    }));

    exportToCSV(exportData, `expenses-${companyId}-${Date.now()}.csv`);
    toast.success('Expenses exported to CSV');
  };

  const total = expenses.reduce((sum, item) => sum + calculateTotalWithVat(item.amount, item.vat_amount, includeVat), 0);

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Expenses</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Total: {formatCurrency(total, currency)} {includeVat ? '(VAT included)' : '(VAT excluded)'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="gap-2" disabled={expenses.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => openDialog()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No expense records yet"
          description="Add your first expense record to track spending"
          action={{ label: 'Add Expense', onClick: () => openDialog() }}
        />
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-sm">{formatDate(expense.date)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{expense.title}</div>
                    {expense.notes && <div className="text-xs text-zinc-400 mt-1">{expense.notes}</div>}
                  </TableCell>
                  <TableCell className="text-sm">
                    {expense.expense_category || <span className="text-zinc-500">Uncategorized</span>}
                  </TableCell>
                  <TableCell>{formatCurrency(expense.amount, expense.currency)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(calculateTotalWithVat(expense.amount, expense.vat_amount, includeVat), expense.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(expense)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(expense.id)}>
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
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
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
                <Label htmlFor="category">Category</Label>
                <Select value={formData.expense_category} onValueChange={(val) => setFormData({ ...formData, expense_category: val })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Uncategorized</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Office supplies"
                required
              />
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {editingExpense ? 'Update' : 'Create'}
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
        title="Delete Expense"
        description="Are you sure you want to delete this expense record? This action cannot be undone."
      />
    </div>
  );
}
