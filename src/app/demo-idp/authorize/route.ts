import { authorize, demoOnly } from "@/demo/idp/handlers";

export const dynamic = "force-dynamic";

export const GET = demoOnly(authorize);
export const POST = demoOnly(authorize);
