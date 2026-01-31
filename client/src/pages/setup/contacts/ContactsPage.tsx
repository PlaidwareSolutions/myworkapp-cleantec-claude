import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Users, Search, UserCog } from "lucide-react";

const CONTACT_TYPES = ["ALL", "CUSTOMER", "CARRIER", "PROCESSOR", "ADMIN"];

export default function ContactsPage() {
  const [type, setType] = useState("ALL");
  const [search, setSearch] = useState("");
  const { hasPermission } = useAuth();

  const queryParams = new URLSearchParams();
  if (type !== "ALL") queryParams.set("type", type);
  if (search) queryParams.set("search", search);

  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/contact?${queryParams}`],
  });

  const contacts = data?.data || [];
  const totalCount = data?.count || contacts.length;

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
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Contacts ({totalCount})
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 w-[200px]"
                  data-testid="input-search-contacts"
                />
              </div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t === "ALL" ? "All Types" : t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          ) : contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contacts found
            </div>
          ) : (
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
                {contacts.map((contact: any) => (
                  <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{contact.type}</Badge>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
