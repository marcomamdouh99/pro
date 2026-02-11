'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, RefreshCw, AlertTriangle, Trash2, TrendingDown, Calendar } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
}

interface WasteLog {
  id: string;
  branchId: string;
  ingredient: Ingredient;
  quantity: number;
  unit: string;
  reason: 'EXPIRED' | 'SPOILED' | 'DAMAGED' | 'PREPARATION' | 'MISTAKE' | 'THEFT' | 'OTHER';
  lossValue: number;
  notes?: string;
  createdAt: string;
  recorder: { name?: string };
}

interface WasteStats {
  totalLogs: number;
  totalLossValue: number;
  avgLossPerLog: number;
}

export default function WasteTracking() {
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stats, setStats] = useState<WasteStats>({ totalLogs: 0, totalLossValue: 0, avgLossPerLog: 0 });
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    ingredientId: '',
    quantity: 0,
    reason: 'EXPIRED' as const,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      console.log('Fetching waste data...');
      const [wasteRes, ingredientsRes, statsRes] = await Promise.all([
        fetch('/api/waste-logs'),
        fetch('/api/ingredients'),
        fetch('/api/waste-logs/stats'),
      ]);

      console.log('Waste response:', wasteRes.status);
      console.log('Ingredients response:', ingredientsRes.status);
      console.log('Stats response:', statsRes.status);

      if (wasteRes.ok) {
        const data = await wasteRes.json();
        console.log('Waste logs:', data.wasteLogs);
        setWasteLogs(data.wasteLogs);
      } else {
        const errorText = await wasteRes.text();
        console.error('Failed to fetch waste logs - Status:', wasteRes.status, 'Response:', errorText);
      }
      if (ingredientsRes.ok) {
        const data = await ingredientsRes.json();
        console.log('Ingredients:', data.ingredients);
        setIngredients(data.ingredients);
      } else {
        const errorText = await ingredientsRes.text();
        console.error('Failed to fetch ingredients - Status:', ingredientsRes.status, 'Response:', errorText);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        console.log('Stats:', data.summary);
        setStats(data.summary);
      } else {
        const errorText = await statsRes.text();
        console.error('Failed to fetch stats - Status:', statsRes.status, 'Response:', errorText);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      console.log('Data fetch completed, loading:', false);
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'EXPIRED':
        return 'bg-red-100 text-red-700';
      case 'SPOILED':
        return 'bg-orange-100 text-orange-700';
      case 'DAMAGED':
        return 'bg-yellow-100 text-yellow-700';
      case 'PREPARATION':
        return 'bg-blue-100 text-blue-700';
      case 'MISTAKE':
        return 'bg-purple-100 text-purple-700';
      case 'THEFT':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    // If user is ADMIN without branch, get the first branch
    let branchId = user?.branchId;
    if (!branchId && user?.role === 'ADMIN') {
      try {
        const res = await fetch('/api/branches');
        const data = await res.json();
        if (data.branches && data.branches.length > 0) {
          branchId = data.branches[0].id;
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err);
      }
    }

    if (!branchId) {
      alert('No branch assigned. Please contact administrator.');
      return;
    }

    try {
      const response = await fetch('/api/waste-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          branchId,
          userId: user?.id,
          unit: ingredients.find(i => i.id === formData.ingredientId)?.unit || 'unit',
        }),
      });

      if (response.ok) {
        fetchData();
        setIsDialogOpen(false);
        setFormData({ ingredientId: '', quantity: 0, reason: 'EXPIRED', notes: '' });
      } else {
        const data = await response.json();
        console.error('Waste log error:', data);
        let errorMsg = data.error || 'Failed to record waste';
        if (data.available !== undefined) {
          errorMsg = `Insufficient stock. Available: ${data.available}, Requested: ${data.requested}`;
        }
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Failed to record waste:', error);
      alert('Failed to record waste');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Waste Logs</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalLogs}</p>
              </div>
              <div className="p-3 bg-slate-100 rounded-full">
                <Trash2 className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Loss Value</p>
                <p className="text-2xl font-bold text-red-600">${stats.totalLossValue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Avg Loss per Log</p>
                <p className="text-2xl font-bold text-orange-600">${stats.avgLossPerLog.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-emerald-600" />
                Waste & Loss Tracking
              </CardTitle>
              <CardDescription>Record and track inventory waste</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Waste
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Waste</DialogTitle>
                    <DialogDescription>Document inventory waste or loss</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Ingredient *</Label>
                        <Select 
                          value={formData.ingredientId} 
                          onValueChange={(val) => setFormData({ ...formData, ingredientId: val })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ingredient" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map(ing => (
                              <SelectItem key={ing.id} value={ing.id}>
                                {ing.name} ({ing.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Reason *</Label>
                        <Select 
                          value={formData.reason}
                          onValueChange={(val: any) => setFormData({ ...formData, reason: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EXPIRED">Expired</SelectItem>
                            <SelectItem value="SPOILED">Spoiled</SelectItem>
                            <SelectItem value="DAMAGED">Damaged</SelectItem>
                            <SelectItem value="PREPARATION">Preparation</SelectItem>
                            <SelectItem value="MISTAKE">Mistake</SelectItem>
                            <SelectItem value="THEFT">Theft</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Notes</Label>
                        <Input
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Additional details..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); }}>
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                        Record Waste
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Loss Value</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wasteLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{log.ingredient.name}</TableCell>
                      <TableCell>
                        {log.quantity.toFixed(2)} {log.unit}
                      </TableCell>
                      <TableCell>
                        <Badge className={getReasonColor(log.reason)}>
                          {log.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-red-600 font-medium">
                        ${log.lossValue.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {log.recorder.name || 'Unknown'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
