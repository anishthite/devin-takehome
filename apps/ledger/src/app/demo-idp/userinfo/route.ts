import { userinfo, demoOnly } from "@kit/demo/idp/handlers";

export const dynamic = "force-dynamic";

export const GET = demoOnly(userinfo);
