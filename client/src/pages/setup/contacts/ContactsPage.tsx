import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Users, Search, UserCog, X, Filter } from "lucide-react";

type TypeFilter = "ALL" | "CUSTOMER" | "CARRIER" | "PROCESSOR" | "ADMIN" | "OWNER" | "EMPLOYEE";
type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SystemUserFilter = "ALL" | "HAS_USER" | "NO_USER";

const CONTACT_TYPES: TypeFilter[] = ["ALL", "CUSTOMER", "CARRIER", "PROCESSOR", "ADMIN", "OWNER", "EMPLOYEE"];

export default function ContactsPage() {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [systemUserFilter, setSystemUserFilter] = useState<SystemUserFilter>("ALL");
  const [search, setSearch] = useState("");
  const { hasPermission } = useAuth();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/contact", { active: "all" }],
    queryFn: () => fetch("/api/contact?active=all").then(res => res.json()),
  });

  const allContacts = data?.data || [];

  const filteredContacts = useMemo(() => {
    return allContacts.filter((contact: any) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        contact.name?.toLowerCase().includes(searchLower) ||
        contact.email?.[0]?.toLowerCase().includes(searchLower) ||
        contact.phone?.[0]?.includes(search) ||
        contact.systemUserUsername?.toLowerCase().includes(searchLower);

      const contactType = typeof contact.type === 'object' ? contact.type?.id : contact.type;
      const matchesType = typeFilter === "ALL" || contactType === typeFilter;
      
      const matchesStatus = statusFilter === "ALL" || 
        (statusFilter === "ACTIVE" && contact.active) ||
        (statusFilter === "INACTIVE" && !contact.active);
      
      const matchesSystemUser = systemUserFilter === "ALL" ||
        (systemUserFilter === "HAS_USER" && contact.systemUserActive) ||
        (systemUserFilter === "NO_USER" && !contact.systemUserActive);

      return matchesSearch && matchesType && matchesStatus && matchesSystemUser;
    });
  }, [allContacts, search, typeFilter, statusFilter, systemUserFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<TypeFilter, number> = { ALL: allContacts.length, CUSTOMER: 0, CARRIER: 0, PROCESSOR: 0, ADMIN: 0, OWNER: 0, EMPLOYEE: 0 };
    allContacts.forEach((c: any) => {
      const contactType = typeof c.type === 'object' ? c.type?.id : c.type;
      if (counts[contactType as TypeFilter] !== undefined) counts[contactType as TypeFilter]++;
    });
    return counts;
  }, [allContacts]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { ALL: allContacts.length, ACTIVE: 0, INACTIVE: 0 };
    allContacts.forEach((c: any) => {
      if (c.active) counts.ACTIVE++;
      else counts.INACTIVE++;
    });
    return counts;
  }, [allContacts]);

  const systemUserCounts = useMemo(() => {
    const counts: Record<SystemUserFilter, number> = { ALL: allContacts.length, HAS_USER: 0, NO_USER: 0 };
    allContacts.forEach((c: any) => {
      if (c.systemUserActive) counts.HAS_USER++;
      else counts.NO_USER++;
    });
    return counts;
  }, [allContacts]);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setSystemUserFilter("ALL");
  };

  const hasActiveFilters = search || typeFilter !== "ALL" || statusFilter !== "ALL" || systemUserFilter !== "ALL";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage customers, carriers, and processors</p>
        </div>
        {hasPermission(["UserManagement", "admin"]) && (
          <Link href="/setup/contacts/add">
            <Button data-testid="button-add-contact">
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contacts
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search-contacts"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Type:</span>
                <div className="flex gap-1 flex-wrap">
                  {CONTACT_TYPES.map((t) => (
                    <Button
                      key={t}
                      variant={typeFilter === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTypeFilter(t)}
                      data-testid={`filter-type-${t.toLowerCase()}`}
                    >
                      {t === "ALL" ? "All" : t.charAt(0) + t.slice(1).toLowerCase()}
                      {typeCounts[t] > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {typeCounts[t]}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <div className="flex gap-1">
                  {(["ALL", "ACTIVE", "INACTIVE"] as StatusFilter[]).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      data-testid={`filter-status-${status.toLowerCase()}`}
                    >
                      {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
                      {statusCounts[status] > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {statusCounts[status]}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">System User:</span>
                <div className="flex gap-1">
                  {(["ALL", "HAS_USER", "NO_USER"] as SystemUserFilter[]).map((filter) => (
                    <Button
                      key={filter}
                      variant={systemUserFilter === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSystemUserFilter(filter)}
                      data-testid={`filter-sysuser-${filter.toLowerCase()}`}
                    >
                      {filter === "ALL" ? "All" : filter === "HAS_USER" ? "Has Login" : "No Login"}
                      {systemUserCounts[filter] > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {systemUserCounts[filter]}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              {hasActiveFilters ? (
                <>
                  <p>No contacts match your filters</p>
                  <Button variant="ghost" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                </>
              ) : (
                <p>No contacts found</p>
              )}
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground mb-3">
                Showing {filteredContacts.length} of {allContacts.length} contacts
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>System User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact: any) => (
                  <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{typeof contact.type === 'object' ? contact.type?.id : contact.type}</Badge>
                    </TableCell>
                    <TableCell>{contact.email?.[0] || "-"}</TableCell>
                    <TableCell>{contact.phone?.[0] || "-"}</TableCell>
                    <TableCell>
                      {contact.systemUserActive ? (
                        <Badge variant="default" className="gap-1">
                          <UserCog className="h-3 w-3" />
                          {contact.systemUserUsername}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={contact.active ? "default" : "secondary"}>
                        {contact.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/setup/contacts/update/${contact.id}`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
