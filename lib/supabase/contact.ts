import { createClient } from "./client";

export type RequestType = "access" | "deletion" | "correction" | "other";

export async function submitContactRequest(data: {
  name: string;
  email: string;
  request_type: RequestType;
  message: string;
}): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("contact_requests").insert(data);
  if (error) {
    console.error("Contact request error:", error);
    return false;
  }
  return true;
}
