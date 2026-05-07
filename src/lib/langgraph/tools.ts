import { tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";
import { createAdminClient } from "@/utils/supabase/admin";
import { hitlTools } from "./hitlTools";

// ─── Internal types ────────────────────────────────────────────────────────────

type DbClient = ReturnType<typeof createAdminClient>;
type TransactionType = "income" | "expense";

// ─── Shared DB helpers (mirrors logic in existing API routes) ──────────────────

function parseDateParts(dateStr: string) {
  const [y, m, d] = String(dateStr).split("T")[0].split("-");
  return { day: parseInt(d, 10), month: parseInt(m, 10), year: parseInt(y, 10) };
}

async function upsertMonthHistory(
  db: DbClient,
  userId: string,
  day: number,
  month: number,
  year: number,
  type: TransactionType,
  delta: number
) {
  const { data: row } = await db
    .from("month_history")
    .select("id, income, expense")
    .eq("user_id", userId)
    .eq("day", day)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (row) {
    await db
      .from("month_history")
      .update({
        income:
          type === "income"
            ? Math.max(0, Number(row.income) + delta)
            : Number(row.income),
        expense:
          type === "expense"
            ? Math.max(0, Number(row.expense) + delta)
            : Number(row.expense),
      })
      .eq("id", row.id);
  } else if (delta > 0) {
    await db.from("month_history").insert({
      user_id: userId,
      day,
      month,
      year,
      income: type === "income" ? delta : 0,
      expense: type === "expense" ? delta : 0,
    });
  }
}

async function upsertYearHistory(
  db: DbClient,
  userId: string,
  month: number,
  year: number,
  type: TransactionType,
  delta: number
) {
  const { data: row } = await db
    .from("year_history")
    .select("id, income, expense")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (row) {
    await db
      .from("year_history")
      .update({
        income:
          type === "income"
            ? Math.max(0, Number(row.income) + delta)
            : Number(row.income),
        expense:
          type === "expense"
            ? Math.max(0, Number(row.expense) + delta)
            : Number(row.expense),
      })
      .eq("id", row.id);
  } else if (delta > 0) {
    await db.from("year_history").insert({
      user_id: userId,
      month,
      year,
      income: type === "income" ? delta : 0,
      expense: type === "expense" ? delta : 0,
    });
  }
}

// ─── Category resolver ─────────────────────────────────────────────────────────

async function resolveCategoryId(
  db: DbClient,
  categoryName: string,
  type: TransactionType
): Promise<{ id: string; name: string } | null> {
  const { data } = await db
    .from("categories")
    .select("id, name")
    .eq("type", type);

  if (!data?.length) return null;

  const lower = categoryName.toLowerCase();

  return (
    data.find((c) => c.name.toLowerCase() === lower) ??
    data.find((c) => c.name.toLowerCase().includes(lower)) ??
    data.find((c) => lower.includes(c.name.toLowerCase())) ??
    null
  );
}

// ─── Tool: get_categories ──────────────────────────────────────────────────────

export const getCategoriesToolDef = tool(
  async (
    { type }: { type?: "income" | "expense" | "all" },
    _config?: RunnableConfig
  ): Promise<string> => {
    const db = createAdminClient();
    let query = db.from("categories").select("id, name, icon, type").order("name");
    if (type && type !== "all") query = (query as any).eq("type", type);

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;

    const income = (data ?? []).filter((c) => c.type === "income");
    const expense = (data ?? []).filter((c) => c.type === "expense");

    return JSON.stringify({
      incomeCategories: income.map((c) => ({ id: c.id, name: c.name })),
      expenseCategories: expense.map((c) => ({ id: c.id, name: c.name })),
    });
  },
  {
    name: "get_categories",
    description:
      "Get all available income and expense categories. Call this when you are unsure which category to use for a transaction.",
    schema: z.object({
      type: z
        .enum(["income", "expense", "all"])
        .optional()
        .describe("Filter by category type, or omit for all"),
    }),
  }
);

// ─── Tool: add_transaction ─────────────────────────────────────────────────────

const addTransactionSchema = z.object({
  amount: z.number().min(1).describe("Amount in rupees (₹)"),
  type: z.enum(["income", "expense"]),
  categoryName: z
    .string()
    .describe("Category name e.g. Food, Travel, Salary. Will be fuzzy-matched."),
  date: z
    .string()
    .describe(
      "Date as YYYY-MM-DD. Convert relative dates (today, yesterday, last Monday) to absolute."
    ),
  description: z.string().optional().describe("Optional note or description"),
});

export const addTransactionToolDef = tool(
  async (
    input: z.infer<typeof addTransactionSchema>,
    config?: RunnableConfig
  ): Promise<string> => {
    const userId = (config as any)?.configurable?.userId as string | undefined;
    if (!userId) return "Error: Not authenticated";

    const db = createAdminClient();
    const category = await resolveCategoryId(db, input.categoryName, input.type);

    if (!category) {
      const { data: cats } = await db
        .from("categories")
        .select("name")
        .eq("type", input.type);
      const available = cats?.map((c) => c.name).join(", ") ?? "none";
      return `Category "${input.categoryName}" not found for ${input.type}. Available: ${available}`;
    }

    const { data: tx, error } = await db
      .from("transactions")
      .insert({
        user_id: userId,
        category_id: category.id,
        amount: Number(input.amount),
        type: input.type,
        date: input.date,
        description: input.description ?? null,
      })
      .select("id")
      .single();

    if (error) return `Error: ${error.message}`;

    const { day, month, year } = parseDateParts(input.date);
    await Promise.all([
      upsertMonthHistory(db, userId, day, month, year, input.type, input.amount),
      upsertYearHistory(db, userId, month, year, input.type, input.amount),
    ]);

    return JSON.stringify({
      success: true,
      id: tx.id,
      message: `Added ${input.type} of ₹${input.amount} in ${category.name} on ${input.date}${input.description ? ` — "${input.description}"` : ""}`,
    });
  },
  {
    name: "add_transaction",
    description:
      "Add a single income or expense transaction. For multiple transactions call this tool in parallel.",
    schema: addTransactionSchema,
  }
);

// ─── Tool: add_transactions_bulk ───────────────────────────────────────────────

const bulkItemSchema = z.object({
  amount: z.number().min(1),
  type: z.enum(["income", "expense"]),
  categoryName: z.string(),
  date: z.string().describe("YYYY-MM-DD"),
  description: z.string().optional(),
});

export const addTransactionsBulkToolDef = tool(
  async (
    { transactions }: { transactions: z.infer<typeof bulkItemSchema>[] },
    config?: RunnableConfig
  ): Promise<string> => {
    const userId = (config as any)?.configurable?.userId as string | undefined;
    if (!userId) return "Error: Not authenticated";

    const db = createAdminClient();
    const results: { amount: number; category: string; status: string; error?: string }[] =
      [];

    for (const tx of transactions) {
      const category = await resolveCategoryId(db, tx.categoryName, tx.type);
      if (!category) {
        results.push({
          amount: tx.amount,
          category: tx.categoryName,
          status: "failed",
          error: "Category not found",
        });
        continue;
      }

      const { data: inserted, error } = await db
        .from("transactions")
        .insert({
          user_id: userId,
          category_id: category.id,
          amount: Number(tx.amount),
          type: tx.type,
          date: tx.date,
          description: tx.description ?? null,
        })
        .select("id")
        .single();

      if (error) {
        results.push({ amount: tx.amount, category: category.name, status: "failed", error: error.message });
        continue;
      }

      const { day, month, year } = parseDateParts(tx.date);
      await Promise.all([
        upsertMonthHistory(db, userId, day, month, year, tx.type, tx.amount),
        upsertYearHistory(db, userId, month, year, tx.type, tx.amount),
      ]);

      results.push({ amount: tx.amount, category: category.name, status: "added" });
    }

    const added = results.filter((r) => r.status === "added").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return JSON.stringify({ added, failed, results });
  },
  {
    name: "add_transactions_bulk",
    description:
      "Add 3 or more transactions at once from a list the user provides. More efficient than multiple single calls.",
    schema: z.object({
      transactions: z
        .array(bulkItemSchema)
        .min(2)
        .describe("List of transactions to add"),
    }),
  }
);

// ─── Tool: list_transactions ───────────────────────────────────────────────────

export const listTransactionsToolDef = tool(
  async (
    {
      startDate,
      endDate,
      type,
      categoryName,
      limit,
    }: {
      startDate?: string;
      endDate?: string;
      type?: TransactionType;
      categoryName?: string;
      limit?: number;
    },
    config?: RunnableConfig
  ): Promise<string> => {
    const userId = (config as any)?.configurable?.userId as string | undefined;
    if (!userId) return "Error: Not authenticated";

    const db = createAdminClient();
    let query = db
      .from("transactions")
      .select("id, date, type, amount, description, categories(id, name)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit ?? 10);

    if (startDate) query = (query as any).gte("date", startDate);
    if (endDate) query = (query as any).lte("date", endDate);
    if (type) query = (query as any).eq("type", type);

    const { data, error } = await query;
    if (error) return `Error: ${error.message}`;

    let rows = (data ?? []) as any[];

    if (categoryName) {
      const lower = categoryName.toLowerCase();
      rows = rows.filter((t) => {
        const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
        return cat?.name?.toLowerCase().includes(lower);
      });
    }

    const transactions = rows.map((t) => {
      const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
      return {
        id: t.id,
        date: t.date,
        type: t.type,
        amount: Number(t.amount),
        category: cat?.name ?? "Unknown",
        description: t.description ?? null,
      };
    });

    return JSON.stringify({ count: transactions.length, transactions });
  },
  {
    name: "list_transactions",
    description:
      "List transactions with optional filters. Always call this first to get transaction IDs before updating or deleting.",
    schema: z.object({
      startDate: z.string().optional().describe("Start date YYYY-MM-DD"),
      endDate: z.string().optional().describe("End date YYYY-MM-DD"),
      type: z.enum(["income", "expense"]).optional(),
      categoryName: z.string().optional().describe("Filter by category name"),
      limit: z.number().optional().default(10).describe("Max results, default 10"),
    }),
  }
);

// ─── Tool: update_transaction ──────────────────────────────────────────────────

export const updateTransactionToolDef = tool(
  async (
    {
      id,
      amount,
      type,
      categoryName,
      date,
      description,
    }: {
      id: string;
      amount?: number;
      type?: TransactionType;
      categoryName?: string;
      date?: string;
      description?: string;
    },
    config?: RunnableConfig
  ): Promise<string> => {
    const userId = (config as any)?.configurable?.userId as string | undefined;
    if (!userId) return "Error: Not authenticated";

    const db = createAdminClient();

    const { data: old, error: fetchErr } = await db
      .from("transactions")
      .select("amount, type, date, category_id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !old) return "Error: Transaction not found";

    const newType = (type ?? old.type) as TransactionType;
    const newAmount = amount !== undefined ? Number(amount) : Number(old.amount);
    const newDate = date ?? old.date;

    let newCategoryId = old.category_id;
    if (categoryName) {
      const cat = await resolveCategoryId(db, categoryName, newType);
      if (!cat) return `Category "${categoryName}" not found for ${newType}`;
      newCategoryId = cat.id;
    }

    // Roll back old history
    const oldParts = parseDateParts(old.date);
    await Promise.all([
      upsertMonthHistory(db, userId, oldParts.day, oldParts.month, oldParts.year, old.type as TransactionType, -Number(old.amount)),
      upsertYearHistory(db, userId, oldParts.month, oldParts.year, old.type as TransactionType, -Number(old.amount)),
    ]);

    const { error: updateErr } = await db
      .from("transactions")
      .update({
        amount: newAmount,
        type: newType,
        date: newDate,
        category_id: newCategoryId,
        description: description ?? null,
      })
      .eq("id", id)
      .eq("user_id", userId);

    if (updateErr) {
      // Restore history on failure
      await Promise.all([
        upsertMonthHistory(db, userId, oldParts.day, oldParts.month, oldParts.year, old.type as TransactionType, Number(old.amount)),
        upsertYearHistory(db, userId, oldParts.month, oldParts.year, old.type as TransactionType, Number(old.amount)),
      ]);
      return `Error: ${updateErr.message}`;
    }

    // Apply new history
    const newParts = parseDateParts(newDate);
    await Promise.all([
      upsertMonthHistory(db, userId, newParts.day, newParts.month, newParts.year, newType, newAmount),
      upsertYearHistory(db, userId, newParts.month, newParts.year, newType, newAmount),
    ]);

    return JSON.stringify({ success: true, message: "Transaction updated successfully" });
  },
  {
    name: "update_transaction",
    description:
      "Update an existing transaction by its ID. Use list_transactions first to get the ID. Only provide fields you want to change.",
    schema: z.object({
      id: z.string().describe("Transaction ID from list_transactions"),
      amount: z.number().min(1).optional(),
      type: z.enum(["income", "expense"]).optional(),
      categoryName: z.string().optional(),
      date: z.string().optional().describe("New date YYYY-MM-DD"),
      description: z.string().optional(),
    }),
  }
);

// ─── Tool: delete_transaction ──────────────────────────────────────────────────

export const deleteTransactionToolDef = tool(
  async (
    { id }: { id: string },
    config?: RunnableConfig
  ): Promise<string> => {
    const userId = (config as any)?.configurable?.userId as string | undefined;
    if (!userId) return "Error: Not authenticated";

    const db = createAdminClient();

    const { data: tx, error: fetchErr } = await db
      .from("transactions")
      .select("amount, type, date, categories(name)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchErr || !tx) return "Error: Transaction not found";

    const { error: deleteErr } = await db
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteErr) return `Error: ${deleteErr.message}`;

    const { day, month, year } = parseDateParts(tx.date);
    await Promise.all([
      upsertMonthHistory(db, userId, day, month, year, tx.type as TransactionType, -Number(tx.amount)),
      upsertYearHistory(db, userId, month, year, tx.type as TransactionType, -Number(tx.amount)),
    ]);

    const catName =
      tx.categories && !Array.isArray(tx.categories)
        ? (tx.categories as any).name
        : Array.isArray(tx.categories)
        ? (tx.categories[0] as any)?.name
        : "Unknown";

    return JSON.stringify({
      success: true,
      message: `Deleted ${tx.type} of ₹${tx.amount} (${catName}) on ${tx.date}`,
    });
  },
  {
    name: "delete_transaction",
    description:
      "Permanently delete a transaction by its ID. Always confirm with the user before calling this. Use list_transactions first to get the ID.",
    schema: z.object({
      id: z.string().describe("Transaction ID to delete"),
    }),
  }
);

// ─── Tool: get_spending_summary ────────────────────────────────────────────────

export const getSpendingSummaryToolDef = tool(
  async (
    { startDate, endDate }: { startDate: string; endDate: string },
    config?: RunnableConfig
  ): Promise<string> => {
    const userId = (config as any)?.configurable?.userId as string | undefined;
    if (!userId) return "Error: Not authenticated";

    const db = createAdminClient();
    const { data: transactions, error } = await db
      .from("transactions")
      .select("type, amount, categories(name)")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) return `Error: ${error.message}`;

    const rows = transactions ?? [];
    const totalIncome = rows
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = rows
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0);

    const byCategory = (type: TransactionType) => {
      const total = type === "income" ? totalIncome : totalExpense;
      const map = new Map<string, number>();
      rows
        .filter((t) => t.type === type)
        .forEach((t) => {
          const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
          const name = (cat as any)?.name ?? "Other";
          map.set(name, (map.get(name) ?? 0) + Number(t.amount));
        });
      return Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
        }));
    };

    return JSON.stringify({
      period: `${startDate} to ${endDate}`,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      savingsRate:
        totalIncome > 0
          ? Math.round((1 - totalExpense / totalIncome) * 100)
          : 0,
      topExpenseCategories: byCategory("expense"),
      topIncomeCategories: byCategory("income"),
    });
  },
  {
    name: "get_spending_summary",
    description:
      "Get a full spending summary with income/expense totals and category breakdown for a date range.",
    schema: z.object({
      startDate: z.string().describe("Start date YYYY-MM-DD"),
      endDate: z.string().describe("End date YYYY-MM-DD"),
    }),
  }
);

// ─── Tool: get_monthly_history ─────────────────────────────────────────────────

export const getMonthlyHistoryToolDef = tool(
  async (
    { year, month }: { year: number; month: number },
    config?: RunnableConfig
  ): Promise<string> => {
    const userId = (config as any)?.configurable?.userId as string | undefined;
    if (!userId) return "Error: Not authenticated";

    const db = createAdminClient();
    const { data, error } = await db
      .from("month_history")
      .select("day, income, expense")
      .eq("user_id", userId)
      .eq("month", month)
      .eq("year", year)
      .order("day");

    if (error) return `Error: ${error.message}`;

    const days = (data ?? []).map((r) => ({
      day: r.day,
      income: Number(r.income),
      expense: Number(r.expense),
      net: Number(r.income) - Number(r.expense),
    }));

    const totalIncome = days.reduce((s, d) => s + d.income, 0);
    const totalExpense = days.reduce((s, d) => s + d.expense, 0);
    const peakExpense = [...days].sort((a, b) => b.expense - a.expense)[0] ?? null;
    const peakIncome = [...days].sort((a, b) => b.income - a.income)[0] ?? null;

    return JSON.stringify({
      year,
      month,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      peakExpenseDay: peakExpense,
      peakIncomeDay: peakIncome,
      days,
    });
  },
  {
    name: "get_monthly_history",
    description:
      "Get daily income and expense breakdown for a specific month. Useful for trend analysis within a month.",
    schema: z.object({
      year: z.number().describe("Year e.g. 2024"),
      month: z.number().min(1).max(12).describe("Month 1-12"),
    }),
  }
);

// ─── Tool: get_yearly_history ──────────────────────────────────────────────────

export const getYearlyHistoryToolDef = tool(
  async (
    { year }: { year: number },
    config?: RunnableConfig
  ): Promise<string> => {
    const userId = (config as any)?.configurable?.userId as string | undefined;
    if (!userId) return "Error: Not authenticated";

    const db = createAdminClient();
    const { data, error } = await db
      .from("year_history")
      .select("month, income, expense")
      .eq("user_id", userId)
      .eq("year", year)
      .order("month");

    if (error) return `Error: ${error.message}`;

    const months = (data ?? []).map((r) => ({
      month: r.month,
      income: Number(r.income),
      expense: Number(r.expense),
      net: Number(r.income) - Number(r.expense),
    }));

    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);
    const bestMonth = [...months].sort((a, b) => b.net - a.net)[0] ?? null;
    const worstMonth = [...months].sort((a, b) => a.net - b.net)[0] ?? null;

    return JSON.stringify({
      year,
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      bestMonth,
      worstMonth,
      months,
    });
  },
  {
    name: "get_yearly_history",
    description:
      "Get monthly income and expense breakdown for an entire year. Useful for year-over-year analysis.",
    schema: z.object({
      year: z.number().describe("Year e.g. 2024"),
    }),
  }
);

// ─── Exported tool registry ────────────────────────────────────────────────────

export const financeTools = [
  getCategoriesToolDef,
  addTransactionToolDef,
  addTransactionsBulkToolDef,
  listTransactionsToolDef,
  updateTransactionToolDef,
  deleteTransactionToolDef,
  getSpendingSummaryToolDef,
  getMonthlyHistoryToolDef,
  getYearlyHistoryToolDef,
  ...hitlTools,
];

// Tools that mutate data — used by the frontend to trigger a dashboard refresh
export const MUTATING_TOOL_NAMES = new Set([
  "add_transaction",
  "add_transactions_bulk",
  "update_transaction",
  "delete_transaction",
]);
