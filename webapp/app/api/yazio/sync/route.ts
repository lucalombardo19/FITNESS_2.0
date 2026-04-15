import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { yazioRefresh, yazioLogMeal } from '@/lib/yazio';
import type { MealPlan, Meal, FoodItem } from '@/lib/types';

type UserRow = { yazio_access_token?: string; yazio_refresh_token?: string; yazio_token_expires?: string };

function formatMealForYazio(meal: Meal): string {
  const foods = meal.foods?.map((f: FoodItem) =>
    `  - ${f.name}: ${f.amount} (${f.calories} kcal, P:${f.protein_g}g C:${f.carbs_g}g F:${f.fat_g}g)`
  ).join('\n') ?? '';
  return `🍽️ ${meal.meal_name}${meal.time ? ` (${meal.time})` : ''} — ${Math.round(meal.total_calories)} kcal\n${foods}\nTotali: P:${Math.round(meal.total_protein_g)}g C:${Math.round(meal.total_carbs_g)}g F:${Math.round(meal.total_fat_g)}g`;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

    const uid = parseInt((session.user as { id?: string }).id ?? '0');
    let row = db.prepare('SELECT yazio_access_token, yazio_refresh_token, yazio_token_expires FROM user_data WHERE user_id = ?').get(uid) as UserRow | undefined;

    if (!row?.yazio_access_token) {
      return NextResponse.json({ error: 'Account Yazio non connesso. Vai su Impostazioni.' }, { status: 400 });
    }

    // Refresh token if needed
    let token = row.yazio_access_token;
    if (row.yazio_token_expires) {
      const expiresAt = new Date(row.yazio_token_expires).getTime();
      if (Date.now() > expiresAt - 3600_000 && row.yazio_refresh_token) {
        const refreshed = await yazioRefresh(row.yazio_refresh_token);
        db.prepare(`UPDATE user_data SET yazio_access_token = ?, yazio_refresh_token = ?, yazio_token_expires = ? WHERE user_id = ?`)
          .run(refreshed.access_token, refreshed.refresh_token, refreshed.expires_at, uid);
        token = refreshed.access_token;
      }
    }

    const { meal_plan } = await req.json() as { meal_plan: MealPlan };
    if (!meal_plan?.meals?.length) {
      return NextResponse.json({ error: 'Nessun piano alimentare da sincronizzare' }, { status: 400 });
    }

    // Log each meal to Yazio
    const synced: string[] = [];
    for (const meal of meal_plan.meals) {
      const details = formatMealForYazio(meal);
      await yazioLogMeal(token, details);
      synced.push(meal.meal_name);
    }

    return NextResponse.json({ ok: true, synced, count: synced.length });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as { message?: string })?.message }, { status: 500 });
  }
}
