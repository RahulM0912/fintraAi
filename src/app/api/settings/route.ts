import { getAuthUser } from "@/utils/supabase/auth";
import {
  getOrCreateSettings,
  publicSettings,
  setByoKey,
  setByoModel,
  removeByoKey,
} from "@/lib/userSettings";
import { findProvider, isValidModel } from "@/lib/aiModels";
import type { ModelProvider } from "@/lib/langgraph/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const row = await getOrCreateSettings(user.id);
  return Response.json(publicSettings(row));
}

interface PutBody {
  provider?: string;
  modelName?: string;
  apiKey?: string;
  removeKey?: boolean;
}

export async function PUT(req: Request) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Remove the BYO key → back to managed tier.
  if (body.removeKey) {
    await removeByoKey(user.id);
    const row = await getOrCreateSettings(user.id);
    return Response.json(publicSettings(row));
  }

  // Add or replace a key (provider + model + key all required).
  if (body.apiKey) {
    const provider = body.provider ?? "";
    const modelName = body.modelName ?? "";
    if (!findProvider(provider)) {
      return Response.json({ error: "Unknown provider" }, { status: 400 });
    }
    if (!isValidModel(provider, modelName)) {
      return Response.json({ error: "Unknown model for provider" }, { status: 400 });
    }
    const key = body.apiKey.trim();
    if (key.length < 8) {
      return Response.json({ error: "API key looks too short" }, { status: 400 });
    }
    await setByoKey(user.id, provider as ModelProvider, modelName, key);
    const row = await getOrCreateSettings(user.id);
    return Response.json(publicSettings(row));
  }

  // Switch model only (keeps the existing key).
  if (body.modelName) {
    const row = await getOrCreateSettings(user.id);
    if (!row.byo_key_cipher || !row.model_provider) {
      return Response.json(
        { error: "Add a key before choosing a model" },
        { status: 400 }
      );
    }
    if (!isValidModel(row.model_provider, body.modelName)) {
      return Response.json({ error: "Unknown model for provider" }, { status: 400 });
    }
    await setByoModel(user.id, body.modelName);
    const updated = await getOrCreateSettings(user.id);
    return Response.json(publicSettings(updated));
  }

  return Response.json({ error: "Nothing to update" }, { status: 400 });
}
