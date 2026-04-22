import { OwnerAdminGuard } from '@/components/admin/OwnerAdminGuard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IssuesTab } from '@/components/admin/IssuesTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { ActivityLogsTab } from '@/components/admin/ActivityLogsTab';
import { EmergencyTab } from '@/components/admin/EmergencyTab';
import { Shield } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <OwnerAdminGuard>
      <div className="px-4 py-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-display font-bold">Owner Admin</h1>
        </div>
        <Tabs defaultValue="issues" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="emergency">Emergency</TabsTrigger>
          </TabsList>
          <TabsContent value="issues" className="mt-4"><IssuesTab /></TabsContent>
          <TabsContent value="users" className="mt-4"><UsersTab /></TabsContent>
          <TabsContent value="activity" className="mt-4"><ActivityLogsTab /></TabsContent>
          <TabsContent value="emergency" className="mt-4"><EmergencyTab /></TabsContent>
        </Tabs>
      </div>
    </OwnerAdminGuard>
  );
}
