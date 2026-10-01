export { auth as proxy } from "@kit/auth";

export const config = {
  matcher: ["/((?!api/auth|signin|demo-idp|_next/static|_next/image|favicon.ico).*)"],
};
