'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useFilters } from '@/lib/filter-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/header';
import { FilterBar } from '@/components/filter-bar';
import { Loading } from '@/components/loading';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Wallet, Download, DollarSign, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { CURRENCIES } from '@/lib/constants';
import { formatCurrency, formatDate, fetchExchangeRate, calculateTotalWithVat, exportToCSV } from '@/lib/helpers';

type PersonalIncome = {
  id: string;
  date: string;
  title: string;
  amount: number;
  vat_amount: number;
  currency: string;
  notes: string | null;
};

type PersonalExpense = {
  id: string;
  date: string;
  title: string;
  amount: number;
  vat_amount: number;
  currency: string;
  expense_category: string | null;
  notes: string | null;
};

export default function PersonalPage() {
  const { user, loading: authLoading } = useAuth();
  const { dateFrom, dateTo, includeVat } = useFilters();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState<PersonalIncome[]>([]);
  const [expenses, setExpenses] = useState<PersonalExpense[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'income' | 'expense'; id: string } | null>(null);
  const [editingIncome, setEditingIncome] = useState<PersonalIncome | null>(null);
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null);
  const [incomeForm, setIncomeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    amount: '',
    vat_amount: '0',
    currency: 'USD',
    notes: '',
  });
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    amount: '',
    vat_amount: '0',
    currency: 'USD',
    expense_category: '',
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, dateFrom, dateTo]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [incomeData, expenseData, categoriesData] = await Promise.all([
        supabase
          .from('personal_income')
          .select('*')
          .gte('date', dateFrom.toISOString().split('T')[0])
          .lte('date', dateTo.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase
          .from('expenses')
          .select('*')
          .eq('scope', 'personal')
          .gte('date', dateFrom.toISOString().split('T')[0])
          .lte('date', dateTo.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase.from('expense_categories').select('name').order('name'),
      ]);

      setIncome(incomeData.data || []);
      setExpenses(expenseData.data || []);
      setCategories(categoriesData.data?.map((c) => c.name) || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load personal finances');
    } finally {
      setLoading(false);
    }
  };

  const openIncomeDialog = (item?: PersonalIncome) => {
    if (item) {
      setEditingIncome(item);
      setIncomeForm({
        date: item.date,
        title: item.title,
        amount: item.amount.toString(),
        vat_amount: item.vat_amount.toString(),
        currency: item.currency,
        notes: item.notes || '',
      });
    } else {
      setEditingIncome(null);
      setIncomeForm({
        date: new Date().toISOString().split('T')[0],
        title: '',
        amount: '',
        vat_amount: '0',
        currency: 'USD',
        notes: '',
      });
    }
    setIncomeDialogOpen(true);
  };

  const openExpenseDialog = (item?: PersonalExpense) => {
    if (item) {
      setEditingExpense(item);
      setExpenseForm({
        date: item.date,
        title: item.title,
        amount: item.amount.toString(),
        vat_amount: item.vat_amount.toString(),
        currency: item.currency,
        expense_category: item.expense_category || '',
        notes: item.notes || '',
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        title: '',
        amount: '',
        vat_amount: '0',
        currency: 'USD',
        expense_category: '',
        notes: '',
      });
    }
    setExpenseDialogOpen(true);
  };

  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        user_id: user.id,
        date: incomeForm.date,
        title: incomeForm.title,
        amount: parseFloat(incomeForm.amount),
        vat_amount: parseFloat(incomeForm.vat_amount) || 0,
        currency: incomeForm.currency,
        notes: incomeForm.notes || null,
      };

      if (editingIncome) {
        const { error } = await supabase
          .from('personal_income')
          .update(payload)
          .eq('id', editingIncome.id);
        if (error) throw error;
        toast.success('Income updated successfully');
      } else {
        const { error } = await supabase.from('personal_income').insert(payload);
        if (error) throw error;
        toast.success('Income recorded successfully');
      }

      setIncomeDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save income');
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        user_id: user.id,
        scope: 'personal' as const,
        company_id: null,
        date: expenseForm.date,
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        vat_amount: parseFloat(expenseForm.vat_amount) || 0,
        currency: expenseForm.currency,
        expense_category: expenseForm.expense_category || null,
        notes: expenseForm.notes || null,
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

      setExpenseDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save expense');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'income') {
        const { error } = await supabase.from('personal_income').delete().eq('id', deleteConfirm.id);
        if (error) throw error;
        toast.success('Income deleted successfully');
      } else {
        const { error } = await supabase.from('expenses').delete().eq('id', deleteConfirm.id);
        if (error) throw error;
        toast.success('Expense deleted successfully');
      }

      setDeleteConfirm(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete record');
    }
  };

  const handleExportIncome = () => {
    const exportData = income.map((item) => ({
      Date: item.date,
      Title: item.title,
      Amount: item.amount,
      VAT: item.vat_amount,
      Currency: item.currency,
      Total: calculateTotalWithVat(item.amount, item.vat_amount, true),
      Notes: item.notes || '',
    }));

    exportToCSV(exportData, `personal-income-${Date.now()}.csv`);
    toast.success('Income exported to CSV');
  };

  const handleExportExpenses = () => {
    const exportData = expenses.map((item) => ({
      Date: item.date,
      Title: item.title,
      Category: item.expense_category || 'Uncategorized',
      Amount: item.amount,
      VAT: item.vat_amount,
      Currency: item.currency,
      Total: calculateTotalWithVat(item.amount, item.vat_amount, true),
      Notes: item.notes || '',
    }));

    exportToCSV(exportData, `personal-expenses-${Date.now()}.csv`);
    toast.success('Expenses exported to CSV');
  };

  if (authLoading || !user) {
    return <Loading />;
  }

  const totalIncome = income.reduce((sum, item) => sum + calculateTotalWithVat(item.amount, item.vat_amount, includeVat), 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + calculateTotalWithVat(item.amount, item.vat_amount, includeVat), 0);
  const net = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <FilterBar />
      <main className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-100">Personal Finances</h1>
          <p className="text-sm text-zinc-400 mt-1">Track your personal income and expenses</p>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Income</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-zinc-400">Expenses</CardTitle>
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
                  <div className={`text-2xl font-bold ${net >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                    {formatCurrency(net, 'USD')}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="income" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-zinc-100">Personal Income</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportIncome} className="gap-2" disabled={income.length === 0}>
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button onClick={() => openIncomeDialog()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Income
                    </Button>
                  </div>
                </div>

                {income.length === 0 ? (
                  <EmptyState
                    icon={DollarSign}
                    title="No income records yet"
                    description="Add your first personal income record"
                    action={{ label: 'Add Income', onClick: () => openIncomeDialog() }}
                  />
                ) : (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Title</TableHead>
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
                              {item.notes && <div className="text-xs text-zinc-400 mt-1">{item.notes}</div>}
                            </TableCell>
                            <TableCell>{formatCurrency(item.amount, item.currency)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(calculateTotalWithVat(item.amount, item.vat_amount, includeVat), item.currency)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openIncomeDialog(item)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'income', id: item.id })}>
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
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-zinc-100">Personal Expenses</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportExpenses} className="gap-2" disabled={expenses.length === 0}>
                      <Download className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button onClick={() => openExpenseDialog()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Expense
                    </Button>
                  </div>
                </div>

                {expenses.length === 0 ? (
                  <EmptyState
                    icon={CreditCard}
                    title="No expense records yet"
                    description="Add your first personal expense record"
                    action={{ label: 'Add Expense', onClick: () => openExpenseDialog() }}
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
                        {expenses.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{formatDate(item.date)}</TableCell>
                            <TableCell>
                              <div className="font-medium">{item.title}</div>
                              {item.notes && <div className="text-xs text-zinc-400 mt-1">{item.notes}</div>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.expense_category || <span className="text-zinc-500">Uncategorized</span>}
                            </TableCell>
                            <TableCell>{formatCurrency(item.amount, item.currency)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(calculateTotalWithVat(item.amount, item.vat_amount, includeVat), item.currency)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openExpenseDialog(item)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm({ type: 'expense', id: item.id })}>
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
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <Dialog open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingIncome ? 'Edit Income' : 'Add Income'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleIncomeSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="income-date">Date</Label>
                <Input
                  id="income-date"
                  type="date"
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="income-currency">Currency</Label>
                <Select value={incomeForm.currency} onValueChange={(val) => setIncomeForm({ ...incomeForm, currency: val })}>
                  <SelectTrigger id="income-currency">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="income-title">Title</Label>
              <Input
                id="income-title"
                value={incomeForm.title}
                onChange={(e) => setIncomeForm({ ...incomeForm, title: e.target.value })}
                placeholder="Freelance payment"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="income-amount">Amount</Label>
                <Input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  value={incomeForm.amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="income-vat">VAT Amount</Label>
                <Input
                  id="income-vat"
                  type="number"
                  step="0.01"
                  value={incomeForm.vat_amount}
                  onChange={(e) => setIncomeForm({ ...incomeForm, vat_amount: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="income-notes">Notes</Label>
              <Textarea
                id="income-notes"
                value={incomeForm.notes}
                onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {editingIncome ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIncomeDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-category">Category</Label>
                <Select value={expenseForm.expense_category} onValueChange={(val) => setExpenseForm({ ...expenseForm, expense_category: val })}>
                  <SelectTrigger id="expense-category">
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
              <Label htmlFor="expense-title">Title</Label>
              <Input
                id="expense-title"
                value={expenseForm.title}
                onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                placeholder="Groceries"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-vat">VAT Amount</Label>
                <Input
                  id="expense-vat"
                  type="number"
                  step="0.01"
                  value={expenseForm.vat_amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vat_amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-currency">Currency</Label>
                <Select value={expenseForm.currency} onValueChange={(val) => setExpenseForm({ ...expenseForm, currency: val })}>
                  <SelectTrigger id="expense-currency">
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

            <div className="space-y-2">
              <Label htmlFor="expense-notes">Notes</Label>
              <Textarea
                id="expense-notes"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {editingExpense ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)} className="flex-1">
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
        title={`Delete ${deleteConfirm?.type === 'income' ? 'Income' : 'Expense'}`}
        description="Are you sure you want to delete this record? This action cannot be undone."
      />
    </div>
  );
}
