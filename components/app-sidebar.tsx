"use client";

import {
  BookOpenIcon,
  CalendarDaysIcon,
  LayoutDashboardIcon,
  PlusCircleIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogTradeButton } from "@/components/log-trade-dialog";
import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    icon: LayoutDashboardIcon,
    title: "Dashboard",
  },
  {
    href: "/trades",
    icon: BookOpenIcon,
    title: "Trades",
  },
  {
    href: "/calendar",
    icon: CalendarDaysIcon,
    title: "Calendar",
  },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/" />}
              size="lg"
              tooltip="Trade Logger"
            >
              <Logo className="size-8 shrink-0" />
              <span className="truncate font-medium text-strong tracking-tight">
                Trade Logger
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Journal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      className={cn(
                        active && "bg-selected font-medium text-strong"
                      )}
                      isActive={active}
                      render={<Link href={item.href} />}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <LogTradeButton
              className="mx-2 h-10 w-[calc(100%-1rem)] justify-start text-sm group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:[&>span]:sr-only"
              size="lg"
            >
              <PlusCircleIcon data-icon="inline-start" />
              <span>Log trade</span>
            </LogTradeButton>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
