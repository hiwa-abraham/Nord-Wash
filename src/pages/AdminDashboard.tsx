import { OwnerAdminGuard } from '@/components/admin/OwnerAdminGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OverviewTab } from '@/components/admin/OverviewTab';
import { IssuesTab } from '@/components/admin/IssuesTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { OrdersTab } from '@/components/admin/OrdersTab';
import { PricingTab } from '@/components/admin/PricingTab';
import { ContentTab } from '@/components/admin/ContentTab';
import { ActivityLogsTab } from '@/components/admin/ActivityLogsTab';
import { EmergencyTab } from '@/components/admin/EmergencyTab';
import { SecurityTab } from '@/components/admin/SecurityTab';
import { Shield } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <OwnerAdminGuard>
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-display font-bold">Owner Admin</h1>
        </div>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="problems">Problems</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
          <TabsContent value="problems" className="mt-4"><IssuesTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="orders" className="mt-4"><OrdersTab /></TabsContent>
          <TabsContent value="pricing" className="mt-4"><PricingTab /></TabsContent>
          <TabsContent value="content" className="mt-4"><ContentTab /></TabsContent>
          <TabsContent value="activity" className="mt-4"><ActivityLogsTab /></TabsContent>
          <TabsContent value="security" className="mt-4"><SecurityTab /></TabsContent>
          <TabsContent value="emergency" className="mt-4"><EmergencyTab /></TabsContent>
        </Tabs>
      </div>
    </OwnerAdminGuard>
  );
}
