import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { categories, employees, financeEntries, projectEmployees, projects } from "@/db/schema";
import { calculateMetrics, rublesToKopecks } from "@/lib/finance";

const defaults = [
  ["Основной доход", "income", "income-main"], ["Внешние программисты", "expense", "expense-external-dev"],
  ["Внутренние программисты", "expense", "expense-internal-dev"], ["Расходы на ИИ", "expense", "expense-ai"],
  ["Аренда сервера", "expense", "expense-server"], ["Дивиденды", "expense", "expense-dividends"],
] as const;

const clean = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
function idOf(value: unknown, field: string) { const id = Number(value); if (!Number.isInteger(id) || id <= 0) throw new Error(`Некорректное поле: ${field}`); return id; }
const failure = (error: unknown) => Response.json({ error: error instanceof Error ? error.message : "Не удалось выполнить операцию" }, { status: 400 });

async function ensureDefaults() {
  const db = getDb();
  for (const [name, kind, systemKey] of defaults) {
    await db.insert(categories).values({ name, kind, systemKey, createdAt: Date.now() }).onConflictDoNothing();
  }
}

async function readDashboard() {
  await ensureDefaults();
  const db = getDb();
  const [categoryRows, employeeRows, projectRows, entryRows, memberRows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.kind), asc(categories.name)),
    db.select().from(employees).orderBy(asc(employees.name)), db.select().from(projects).orderBy(desc(projects.createdAt)),
    db.select({ id: financeEntries.id, projectId: financeEntries.projectId, categoryId: financeEntries.categoryId,
      amountKopecks: financeEntries.amountKopecks, operationDate: financeEntries.operationDate, comment: financeEntries.comment,
      authorName: financeEntries.authorName, categoryName: categories.name, kind: categories.kind })
      .from(financeEntries).innerJoin(categories, eq(financeEntries.categoryId, categories.id))
      .orderBy(desc(financeEntries.operationDate), desc(financeEntries.id)),
    db.select({ projectId: projectEmployees.projectId, employeeId: employees.id, name: employees.name })
      .from(projectEmployees).innerJoin(employees, eq(projectEmployees.employeeId, employees.id)),
  ]);
  const enrichedProjects = projectRows.map((project) => {
    const rows = entryRows.filter((entry) => entry.projectId === project.id);
    return { ...project, ...calculateMetrics(rows), employees: memberRows.filter((m) => m.projectId === project.id), entryCount: rows.length };
  });
  return { categories: categoryRows, employees: employeeRows, projects: enrichedProjects, entries: entryRows, overall: calculateMetrics(entryRows) };
}

export async function GET() {
  try { return Response.json(await readDashboard()); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "База данных недоступна" }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>; const action = clean(body.action, 40); const db = getDb(); const now = Date.now();
    if (action === "createProject") {
      const name = clean(body.name); if (!name) throw new Error("Укажите название проекта");
      const employeeIds = Array.isArray(body.employeeIds) ? body.employeeIds.map((id) => idOf(id, "employeeIds")) : [];
      const [project] = await db.insert(projects).values({ name, client: clean(body.client), createdAt: now }).returning();
      for (const employeeId of employeeIds) await db.insert(projectEmployees).values({ projectId: project.id, employeeId }).onConflictDoNothing();
      return Response.json({ project }, { status: 201 });
    }
    if (action === "createCategory") {
      const name = clean(body.name); const kind = body.kind === "income" ? "income" : body.kind === "expense" ? "expense" : null;
      if (!name || !kind) throw new Error("Укажите название и тип статьи");
      const [category] = await db.insert(categories).values({ name, kind, createdAt: now }).returning(); return Response.json({ category }, { status: 201 });
    }
    if (action === "createEmployee") {
      const name = clean(body.name); if (!name) throw new Error("Укажите имя сотрудника");
      const [employee] = await db.insert(employees).values({ name, email: clean(body.email), createdAt: now }).returning(); return Response.json({ employee }, { status: 201 });
    }
    if (action === "addMember") {
      await db.insert(projectEmployees).values({ projectId: idOf(body.projectId, "projectId"), employeeId: idOf(body.employeeId, "employeeId") }).onConflictDoNothing();
      return Response.json({ ok: true });
    }
    if (action === "createEntry") {
      const operationDate = clean(body.operationDate, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(operationDate)) throw new Error("Укажите дату операции");
      const [entry] = await db.insert(financeEntries).values({ projectId: idOf(body.projectId, "projectId"), categoryId: idOf(body.categoryId, "categoryId"),
        amountKopecks: rublesToKopecks(body.amount as string | number), operationDate, comment: clean(body.comment, 300),
        authorName: clean(body.authorName, 100) || "Сотрудник", createdAt: now }).returning();
      return Response.json({ entry }, { status: 201 });
    }
    if (action === "seedDemo") {
      await ensureDefaults(); if ((await db.select().from(projects).limit(1)).length) throw new Error("Демо-данные можно загрузить только в пустую базу");
      const [anna] = await db.insert(employees).values({ name: "Анна Петрова", email: "a.petrov@example.ru", createdAt: now }).returning();
      const [maxim] = await db.insert(employees).values({ name: "Максим Орлов", email: "m.orlov@example.ru", createdAt: now }).returning();
      const [project] = await db.insert(projects).values({ name: "Внедрение CRM", client: "Альфа", createdAt: now }).returning();
      await db.insert(projectEmployees).values([{ projectId: project.id, employeeId: anna.id }, { projectId: project.id, employeeId: maxim.id }]);
      const refs = Object.fromEntries((await db.select().from(categories)).map((item) => [item.systemKey, item.id]));
      await db.insert(financeEntries).values([
        { projectId: project.id, categoryId: refs["income-main"], amountKopecks: 85000000, operationDate: "2026-09-02", comment: "Первый этап", authorName: anna.name, createdAt: now },
        { projectId: project.id, categoryId: refs["expense-external-dev"], amountKopecks: 22000000, operationDate: "2026-09-03", comment: "Backend-интеграция", authorName: maxim.name, createdAt: now },
        { projectId: project.id, categoryId: refs["expense-ai"], amountKopecks: 3750000, operationDate: "2026-09-04", comment: "API и агенты", authorName: anna.name, createdAt: now },
        { projectId: project.id, categoryId: refs["expense-server"], amountKopecks: 1200000, operationDate: "2026-09-05", comment: "Облако", authorName: anna.name, createdAt: now },
      ]); return Response.json({ ok: true }, { status: 201 });
    }
    throw new Error("Неизвестная операция");
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request) {
  try { await getDb().delete(financeEntries).where(eq(financeEntries.id, idOf(new URL(request.url).searchParams.get("id"), "id"))); return Response.json({ ok: true }); }
  catch (error) { return failure(error); }
}
