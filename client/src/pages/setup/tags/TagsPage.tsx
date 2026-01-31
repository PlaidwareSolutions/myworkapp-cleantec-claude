import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { tagsApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Upload, Tags } from "lucide-react";

export default function TagsPage() {
  const [search, setSearch] = useState("");
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/entity/tag"],
  });

  const tags = data?.data || [];
  const totalCount = data?.count || tags.length;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await tagsApi.import(formData);
      queryClient.invalidateQueries({ queryKey: ["/api/entity/tag"] });
      toast({ title: "Tags imported successfully" });
    } catch (error) {
      toast({ 
        title: "Failed to import tags", 
        description: error instanceof Error ? error.message : "Import failed",
        variant: "destructive" 
      });
    }
    e.target.value = "";
  };

  const filteredTags = search 
    ? tags.filter((tag: any) => 
        tag.epc?.toLowerCase().includes(search.toLowerCase()) ||
        tag.type?.toLowerCase().includes(search.toLowerCase())
      )
    : tags;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground">Manage RFID/EPC tags</p>
        </div>
        <div className="flex gap-2">
          {hasPermission(["AssetManagement", "admin"]) && (
            <>
              <label htmlFor="import-tags">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </span>
                </Button>
              </label>
              <input
                id="import-tags"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImport}
              />
              <Link href="/setup/tags/add">
                <Button data-testid="button-add-tag">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tag
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              All Tags ({totalCount})
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-[200px]"
                data-testid="input-search-tags"
              />
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
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tags found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EPC</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTags.map((tag: any) => (
                  <TableRow key={tag.id} data-testid={`row-tag-${tag.id}`}>
                    <TableCell className="font-mono text-sm">{tag.epc}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tag.type || "RFID"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tag.active ? "default" : "secondary"}>
                        {tag.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{tag.assetId ? "Assigned" : "-"}</TableCell>
                    <TableCell>
                      {tag.createdAt ? new Date(tag.createdAt).toLocaleDateString() : "-"}
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
