import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listProducts } from "@/lib/queries/members";

const BILLING_LABEL: Record<string, string> = {
  monthly: "월간",
  yearly: "연간",
  event: "이벤트",
};

export default async function ProductsPage() {
  const products = await listProducts();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">상품</h1>
        <p className="text-sm text-muted-foreground">
          보상 엔진은 상품에 하드코딩되지 않습니다. 신상품은 행 추가로 확장됩니다(코인비자/거래소 수수료 분배 등).
        </p>
      </div>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>코드</TableHead>
              <TableHead>이름</TableHead>
              <TableHead>가격</TableHead>
              <TableHead>과금</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm">{p.code}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.price_usd != null ? `$${Number(p.price_usd).toFixed(0)}` : "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{BILLING_LABEL[p.billing] ?? p.billing}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
