import { getDb } from "@/db";
import { employees } from "@/db/schema";

function portalDomain(value: unknown) {
  const domain = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9.-]+\.bitrix24\.(ru|com|by|kz)$/.test(domain) ? domain : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { domain?: unknown; accessToken?: unknown }; const domain = portalDomain(body.domain);
    const token = typeof body.accessToken === "string" ? body.accessToken : "";
    if (!domain || !token) return Response.json({ error: "Не получена авторизация Bitrix24" }, { status: 400 });
    const url = new URL(`https://${domain}/rest/user.get.json`); url.searchParams.set("auth", token); url.searchParams.set("ACTIVE", "true");
    const currentUrl = new URL(`https://${domain}/rest/user.current.json`); currentUrl.searchParams.set("auth", token);
    const [response, currentResponse] = await Promise.all([fetch(url, { headers: { Accept: "application/json" } }), fetch(currentUrl, { headers: { Accept: "application/json" } })]);
    const payload = await response.json() as { result?: Array<Record<string, string>>; error_description?: string };
    const currentPayload = await currentResponse.json() as { result?: Record<string, string> };
    if (!response.ok || !payload.result) throw new Error(payload.error_description || "Bitrix24 отклонил токен");
    const db = getDb();
    for (const user of payload.result) {
      const bitrixId = String(user.ID || ""); const name = [user.NAME, user.LAST_NAME].filter(Boolean).join(" ") || user.EMAIL || `Сотрудник ${bitrixId}`;
      await db.insert(employees).values({ bitrixId, name, email: user.EMAIL || null, createdAt: Date.now() })
        .onConflictDoUpdate({ target: employees.bitrixId, set: { name, email: user.EMAIL || null } });
    }
    const current = currentPayload.result; const currentName = current ? [current.NAME, current.LAST_NAME].filter(Boolean).join(" ") || current.EMAIL : null;
    return Response.json({ synced: payload.result.length, currentName });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Ошибка синхронизации" }, { status: 400 }); }
}
