import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";

interface DocItem {
  id: string;
  name: string;
}

interface DocContent {
  id: string;
  name: string;
  content: string;
}

export default function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState<string>("readme");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: docs = [] } = useQuery<DocItem[]>({
    queryKey: ["/api/docs"],
  });

  const { data: docContent, isLoading, error } = useQuery<DocContent>({
    queryKey: [`/api/docs/${selectedDoc}`],
    enabled: !!selectedDoc,
  });

  useEffect(() => {
    if (docs.length > 0 && !selectedDoc) {
      setSelectedDoc(docs[0].id);
    }
  }, [docs, selectedDoc]);

  return (
    <div className="flex h-full" data-testid="docs-page">
      <div
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } transition-all duration-300 border-r bg-muted/30 overflow-hidden`}
      >
        <div className="p-4">
          <h2 className="font-semibold text-lg mb-4">Documentation</h2>
          <nav className="space-y-1">
            {docs.map((doc) => (
              <Button
                key={doc.id}
                variant={selectedDoc === doc.id ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setSelectedDoc(doc.id)}
                data-testid={`doc-nav-${doc.id}`}
              >
                <FileText className="h-4 w-4" />
                {doc.name}
              </Button>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b p-2 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="toggle-docs-sidebar"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <h1 className="font-semibold" data-testid="doc-title">
            {docContent?.name || "Loading..."}
          </h1>
        </div>

        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="text-muted-foreground">Loading documentation...</div>
          ) : error ? (
            <div className="text-destructive">Error loading documentation. Please try again.</div>
          ) : docContent ? (
            <Card>
              <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full border-collapse border border-border">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-muted">{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border px-4 py-2 text-left font-semibold">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-4 py-2">
                        {children}
                      </td>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
                        {children}
                      </pre>
                    ),
                    code: ({ children, className }) => {
                      const isInline = !className;
                      return isInline ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
                          {children}
                        </code>
                      ) : (
                        <code>{children}</code>
                      );
                    },
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold mt-6 mb-4 border-b pb-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold mt-6 mb-3">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-6 my-2 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-6 my-2 space-y-1">
                        {children}
                      </ol>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary pl-4 italic my-4">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="my-6 border-border" />,
                  }}
                >
                  {docContent.content}
                </ReactMarkdown>
              </CardContent>
            </Card>
          ) : (
            <div className="text-muted-foreground">
              Select a document from the sidebar.
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
