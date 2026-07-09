import { AppSidebar } from "@/components/app-sidebar";
import { LogTradeProvider } from "@/components/log-trade-dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <LogTradeProvider>
        <AppSidebar />
        <SidebarInset className="h-svh min-h-0 min-w-0 overflow-y-auto overflow-x-hidden md:h-[calc(100svh-1rem)]">
          {children}
        </SidebarInset>
      </LogTradeProvider>
    </SidebarProvider>
  );
}
