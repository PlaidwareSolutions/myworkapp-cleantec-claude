import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Cpu, AlertCircle } from "lucide-react";

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Devices</h1>
        <p className="text-muted-foreground">Manage RFID readers and scanning devices</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Device Management
          </CardTitle>
          <CardDescription>
            Configure and monitor connected devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No Devices Configured</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Device management requires hardware integration. 
              Contact your system administrator to set up RFID readers and scanning devices.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
