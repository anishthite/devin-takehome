import { userinfo, demoOnly } from "@/demo/idp/handlers";

export const dynamic = "force-dynamic";

export const GET = demoOnly(userinfo);
