import { jwks, demoOnly } from "@/demo/idp/handlers";

export const dynamic = "force-dynamic";

export const GET = demoOnly(jwks);
