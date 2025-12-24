'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/header';
import { Loading } from '@/components/loading';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Plus, Edit2, Trash2, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { CURRENCIES, DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants';

type ExpenseCategory = {
  id: string;
  name: string;
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [categoriesData, settingsData] = await Promise.all([
        supabase
          .from('expense_categories')
          .select('*')
          .order('name'),
        supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (categoriesData.error) throw categoriesData.error;

      setCategories(categoriesData.data || []);

      if (settingsData.data) {
        setDefaultCurrency(settingsData.data.default_currency);
      } else {
        await initializeSettings();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const initializeSettings = async () => {
    if (!user) return;

    try {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({ user_id: user.id, default_currency: 'USD' });

      if (settingsError) throw settingsError;

      const categoryInserts = DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        user_id: user.id,
        name,
      }));

      const { error: categoriesError } = await supabase
        .from('expense_categories')
        .insert(categoryInserts);

      if (categoriesError) throw categoriesError;

      loadData();
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ default_currency: defaultCurrency })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const openDialog = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
    } else {
      setEditingCategory(null);
      setCategoryName('');
    }
    setDialogOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('expense_categories')
          .update({ name: categoryName })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('expense_categories')
          .insert({ user_id: user.id, name: categoryName });
        if (error) throw error;
        toast.success('Category created successfully');
      }

      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', deleteConfirm);

      if (error) throw error;

      toast.success('Category deleted successfully');
      setDeleteConfirm(null);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete category');
    }
  };

  if (authLoading || !user) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      <main className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your preferences and categories</p>
        </div>

        {loading ? (
          <Loading />
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>Configure your default settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="default-currency">Default Currency</Label>
                  <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                    <SelectTrigger id="default-currency" className="w-full md:w-64">
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
                  <p className="text-xs text-zinc-500">
                    This will be used as the default currency for new records
                  </p>
                </div>

                <Button onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Expense Categories</CardTitle>
                    <CardDescription>Manage your expense categories</CardDescription>
                  </div>
                  <Button onClick={() => openDialog()} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <div className="text-center py-8">
                    <SettingsIcon className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-zinc-300 mb-2">No categories yet</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      Create your first expense category
                    </p>
                    <Button onClick={() => openDialog()}>Add Category</Button>
                  </div>
                ) : (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category Name</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openDialog(category)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(category.id)}
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
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input
                id="category-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g., Travel, Marketing, etc."
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">
                {editingCategory ? 'Update' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        description="Are you sure you want to delete this category? Existing expenses using this category will not be affected."
      />
    </div>
  );
}
