import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge } from "@/components/trees/RoleBadge";
import { SpilloverButton } from "@/components/admin/SpilloverButton";
import { StatCard } from "@/components/cards/StatCard";
import { RankPanel } from "@/components/ranks/RankPanel";
import { getMember, getMemberSubscriptions } from "@/lib/queries/members";
import { getMarketerLegs, getMajorMinor } from "@/lib/queries/legs";
import { getMemberRank } from "@/lib/queries/ranks";
import { ROOT_MARKETER_ID } from "@/lib/constants";

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMember(id);
  if (!me) notFound();

  const [recommender, parent, subs] = await Promise.all([
    me.recommender_id ? getMember(me.recommender_id) : Promise.resolve(null),
    me.parent_id ? getMember(me.parent_id) : Promise.resolve(null),
    getMemberSubscriptions(id),
  ]);

  const isMarketer = me.role === "marketer";
  const [legs, mm, rank] = isMarketer
    ? await Promise.all([getMarketerLegs(id), getMajorMinor(id), getMemberRank(id)])
    : [[], null, null];

  // 스필오버: 이 회원을 추천인(없으면 M0)의 대실적 라인 최하단으로 배치
  const placeUnder = me.recommender_id ?? ROOT_MARKETER_ID;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/members" className="text-sm text-muted-foreground hover:underline">
          ← 회원 목록
        </Link>
        <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold">
          {me.display_name}
          <RoleBadge role={me.role} />
          <span
            className={
              "inline-block h-3 w-3 rounded-full " +
              (me.is_active_subscriber ? "bg-emerald-500" : "border border-zinc-400")
            }
            title={me.is_active_subscriber ? "활성 구독자" : "비활성"}
          />
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">두 개의 업라인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">추천인 (수당 귀속)</span>
              <span>
                {recommender ? (
                  <Link href={`/admin/members/${recommender.id}`} className="hover:underline">
                    {recommender.display_name}
                  </Link>
                ) : (
                  "— (루트)"
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">후원 부모 (배치 위치)</span>
              <span>
                {parent ? (
                  <Link href={`/admin/members/${parent.id}`} className="hover:underline">
                    {parent.display_name}
                  </Link>
                ) : (
                  "— (루트)"
                )}
              </span>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              두 값이 다르면 스필오버(상위가 내려꽂아 배치)된 회원입니다.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">스필오버 배치 (운영자)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              이 회원을 <b>{recommender?.display_name ?? "루트 마케터"}</b>의 대실적 라인 최하단으로 이동시킵니다.
            </p>
            <SpilloverButton marketerId={placeUnder} targetMemberId={id} />
          </CardContent>
        </Card>
      </div>

      {isMarketer && mm ? (
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="대실적" value={mm.major_leg} accent="major" />
            <StatCard title="기타소실적" value={mm.other_minor} accent="minor" />
            <StatCard title="총 활성 산하" value={mm.total_active} hint={`${mm.leg_count}개 라인`} />
          </div>
          {rank ? <RankPanel info={rank} /> : null}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">후원 레그별 활성 구독자</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>레그(직속 자식)</TableHead>
                    <TableHead className="text-right">활성 구독자</TableHead>
                    <TableHead className="text-right">구분</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {legs
                    .slice()
                    .sort((a, b) => b.active_count - a.active_count)
                    .map((l, i) => (
                      <TableRow key={l.leg_root}>
                        <TableCell>{l.leg_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.active_count}</TableCell>
                        <TableCell className="text-right">
                          {i === 0 ? (
                            <span className="text-emerald-600">대실적</span>
                          ) : (
                            <span className="text-sky-600">소실적</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">구독 원장 ($120/월)</CardTitle>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">구독 내역 없음 (결제 전 회원).</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>기간</TableHead>
                  <TableHead>금액</TableHead>
                  <TableHead>상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.period_start} ~ {s.period_end}
                    </TableCell>
                    <TableCell>${Number(s.amount_usd).toFixed(0)}</TableCell>
                    <TableCell>
                      <span className={s.status === "active" ? "text-emerald-600" : "text-muted-foreground"}>
                        {s.status === "active" ? "활성" : "만료"}
                      </span>
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
