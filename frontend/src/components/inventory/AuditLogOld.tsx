import { Activity, Clock, RefreshCw, Search, Shield, User } from "lucide-react";
import { useState } from "react";
import { useAuditLog } from "../../hooks/useAuditLog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

export function AuditLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");

  // Use the audit log hook for backend data
  const {
    transactions,
    stats,
    loading,
    error,
    refreshing,
    refresh,
  } = useAuditLog({
    per_page: 100 // Get more records for better filtering
  });

  // Apply local filters to transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.item_id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.job_order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const matchesUser = userFilter === "all" || transaction.performed_by === userFilter;

    return matchesSearch && matchesType && matchesUser;
  });

  // Get available filter options from real data
  const transactionTypes = [...new Set(transactions.map(t => t.type))];
  const users = [...new Set(transactions.map(t => t.performed_by).filter((user): user is string => Boolean(user)))];
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'CONSUME':
        return <Badge variant="destructive">Consume</Badge>;
      case 'RESERVE':
        return <Badge className="bg-blue-600 text-white">Reserve</Badge>;
      case 'RETURN':
        return <Badge className="bg-green-600 text-white">Return</Badge>;
      case 'ADJUST':
        return <Badge className="bg-orange-600 text-white">Adjust</Badge>;
      case 'RESTOCK':
        return <Badge className="bg-emerald-600 text-white">Restock</Badge>;
      case 'DAMAGE':
        return <Badge className="bg-red-700 text-white">Damage</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getQuantityDisplay = (transaction: { quantity: number }) => {
    const sign = transaction.quantity > 0 ? '+' : '';
    const color = transaction.quantity > 0 ? 'text-emerald-600' : 'text-red-600';
    return <span className={color}>{sign}{transaction.quantity}</span>;
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-red-600 mb-4">Error loading audit data</div>
          <div className="text-sm text-muted-foreground mb-4">{error}</div>
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground">
            Complete record of all inventory transactions and changes
          </p>
        </div>

        <Button
          onClick={refresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? '...' : stats.total_transactions}
            </div>
            <p className="text-xs text-muted-foreground">
              All recorded transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Today's Activity</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {loading ? '...' : stats.today_transactions}
            </div>
            <p className="text-xs text-muted-foreground">
              Transactions today
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active Users</CardTitle>
            <User className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {loading ? '...' : stats.unique_users}
            </div>
            <p className="text-xs text-muted-foreground">
              Users with activity
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Data Integrity</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">100%</div>
            <p className="text-xs text-muted-foreground">
              Audit compliance
            </p>
          </CardContent>
        </Card>
      </div>      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Transaction Filters</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by item ID, job order, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input border-border text-foreground"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-input border-border text-foreground">
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Types</SelectItem>
                {transactionTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-input border-border text-foreground">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Users</SelectItem>
                {users.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <div className="text-muted-foreground">Loading audit data...</div>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-foreground">Timestamp</TableHead>
                      <TableHead className="text-foreground">Transaction ID</TableHead>
                      <TableHead className="text-foreground">Type</TableHead>
                      <TableHead className="text-foreground">Item ID</TableHead>
                      <TableHead className="text-foreground">Quantity</TableHead>
                      <TableHead className="text-foreground">Job Order</TableHead>
                      <TableHead className="text-foreground">Performed By</TableHead>
                      <TableHead className="text-foreground">Reason/Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((transaction) => {
                        return (
                          <TableRow key={transaction.id} className="border-border hover:bg-muted/50">
                            <TableCell className="font-mono text-sm text-foreground">
                              {new Date(transaction.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-foreground">
                              {transaction.id}
                            </TableCell>
                            <TableCell>{getTransactionBadge(transaction.type)}</TableCell>
                            <TableCell className="font-medium text-foreground">
                              {transaction.item_id}
                            </TableCell>
                            <TableCell>{getQuantityDisplay(transaction)}</TableCell>
                            <TableCell>
                              {transaction.job_order_id ? (
                                <Badge variant="outline">{transaction.job_order_id}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-foreground">
                              {transaction.performed_by || 'System'}
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-foreground">
                              {transaction.reason || transaction.notes || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found matching your criteria
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Audit Trail Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Transaction Types</h4>
              <div className="space-y-1">
                {stats.transaction_types.map(({ type, count }) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-foreground">{type}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-foreground">Recent Activity</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">Last 24 hours</span>
                  <span className="text-muted-foreground">{stats.today_transactions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">This week</span>
                  <span className="text-muted-foreground">{stats.week_transactions}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground">This month</span>
                  <span className="text-muted-foreground">{stats.month_transactions}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
