/**
 * AuditLogsTab - Display database audit logs for admin review
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText, 
  RefreshCw, 
  Search, 
  Eye,
  Plus,
  Pencil,
  Trash2,
  Clock,
  User,
  Database
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  record_id: string | null;
  old_data: Json;
  new_data: Json;
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

const operationIcons: Record<string, typeof Plus> = {
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

const operationColors: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800',
  UPDATE: 'bg-blue-100 text-blue-800',
  DELETE: 'bg-red-100 text-red-800',
};

export function AuditLogsTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching audit logs:', error);
      toast.error('Failed to load audit logs');
    } else {
      setLogs(data || []);
    }
    setIsLoading(false);
  };

  // Get unique table names for filter
  const tableNames = [...new Set(logs.map(log => log.table_name))];

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.record_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTable = tableFilter === 'all' || log.table_name === tableFilter;
    const matchesOperation = operationFilter === 'all' || log.operation === operationFilter;

    return matchesSearch && matchesTable && matchesOperation;
  });

  const formatJsonDiff = (oldData: Json, newData: Json) => {
    if (!oldData && !newData) return null;
    
    const oldObj = typeof oldData === 'object' && oldData !== null ? oldData as Record<string, unknown> : {};
    const newObj = typeof newData === 'object' && newData !== null ? newData as Record<string, unknown> : {};
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    
    const changes: { key: string; old: unknown; new: unknown; changed: boolean }[] = [];
    
    allKeys.forEach(key => {
      const oldVal = oldObj[key];
      const newVal = newObj[key];
      const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
      
      if (changed || (!oldData && newData) || (oldData && !newData)) {
        changes.push({ key, old: oldVal, new: newVal, changed });
      }
    });

    return changes;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <CardDescription>
              Track all database changes across the system
            </CardDescription>
          </div>
          <Button onClick={fetchAuditLogs} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by table, record ID, or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              {tableNames.map(table => (
                <SelectItem key={table} value={table}>{table}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Operation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Operations</SelectItem>
              <SelectItem value="INSERT">INSERT</SelectItem>
              <SelectItem value="UPDATE">UPDATE</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">
              {logs.filter(l => l.operation === 'INSERT').length}
            </div>
            <div className="text-xs text-green-600">Inserts</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">
              {logs.filter(l => l.operation === 'UPDATE').length}
            </div>
            <div className="text-xs text-blue-600">Updates</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">
              {logs.filter(l => l.operation === 'DELETE').length}
            </div>
            <div className="text-xs text-red-600">Deletes</div>
          </div>
        </div>

        {/* Logs Table */}
        <ScrollArea className="h-[400px] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[100px]">Operation</TableHead>
                <TableHead>Table</TableHead>
                <TableHead className="hidden sm:table-cell">Record ID</TableHead>
                <TableHead className="hidden md:table-cell">User</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="w-[60px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const Icon = operationIcons[log.operation] || FileText;
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge className={operationColors[log.operation] || ''}>
                          <Icon className="h-3 w-3 mr-1" />
                          {log.operation}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.table_name}</TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                        {log.record_id?.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {log.user_id ? (
                          <span className="flex items-center gap-1 text-xs">
                            <User className="h-3 w-3" />
                            {log.user_id.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Badge className={operationColors[log.operation] || ''}>
                                  {log.operation}
                                </Badge>
                                on {log.table_name}
                              </DialogTitle>
                              <DialogDescription>
                                {format(new Date(log.created_at), 'PPpp')}
                                {log.user_id && ` • User: ${log.user_id}`}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              {log.operation === 'UPDATE' && (
                                <div>
                                  <h4 className="font-medium mb-2">Changes</h4>
                                  <div className="space-y-2">
                                    {formatJsonDiff(log.old_data, log.new_data)?.map((change) => (
                                      <div key={change.key} className="p-2 bg-muted rounded text-sm">
                                        <span className="font-mono text-primary">{change.key}</span>
                                        {change.old !== undefined && (
                                          <div className="text-red-600 line-through">
                                            {JSON.stringify(change.old)}
                                          </div>
                                        )}
                                        {change.new !== undefined && (
                                          <div className="text-green-600">
                                            {JSON.stringify(change.new)}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {log.operation === 'INSERT' && log.new_data && (
                                <div>
                                  <h4 className="font-medium mb-2">New Record</h4>
                                  <pre className="p-3 bg-green-50 rounded text-xs overflow-auto">
                                    {JSON.stringify(log.new_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.operation === 'DELETE' && log.old_data && (
                                <div>
                                  <h4 className="font-medium mb-2">Deleted Record</h4>
                                  <pre className="p-3 bg-red-50 rounded text-xs overflow-auto">
                                    {JSON.stringify(log.old_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <div className="text-sm text-muted-foreground text-center">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </CardContent>
    </Card>
  );
}
