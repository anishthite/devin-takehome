import { SESSION_MAX_AGE_SECONDS } from "@kit/auth";
import { memoryApprovalStore } from "@kit/demo/approvals";
import { memoryAuditLog } from "@kit/demo/audit-log";
import { createMockDataverse } from "@kit/demo/dataverse/client";
import { MOCK_ROLE_MAPPING, mockFlowApprovals } from "@kit/demo/dataverse/org";
import { DEMO_PERSONAS } from "@kit/demo/personas";
import { isDemoMode } from "@kit/demo/mode";
import { approvalStatusMirror } from "@kit/dataverse/approval-mirror";
import { dataverseAuditReader } from "@kit/dataverse/audit-reader";
import type { DataverseClient } from "@kit/dataverse/client";
import { isDataverseEnabled, readConnection, readMirrorPrefix, readRoleMapping } from "@kit/dataverse/config";
import { flowApprovalReader, type PowerAutomateApprovalReader } from "@kit/dataverse/flow-approvals";
import { clientCredentialsTokenSource, httpDataverseClient } from "@kit/dataverse/http-client";
import { dataverseRoleProvider } from "@kit/dataverse/role-provider";
import type { Actor } from "@kit/services/actor";
import { createApprovalService, type ApprovalService } from "@kit/services/approvals";
import type { AuditLog } from "@kit/services/audit-log";
import type { AuditReader } from "@kit/services/audit-reader";
import { cachePerSession, claimsRoleProvider, type RoleProvider } from "@kit/services/role-provider";
import { sqlApprovalStore } from "@kit/sql/approval-store";
import { sqlAuditLog } from "@kit/sql/audit-log";
import type { SqlClient } from "@kit/sql/client";
import { getSqlClient } from "@kit/sql/connection";

/**
 * `off`: Entra app-role claims, no Dataverse (default).
 * `mock`: DATAVERSE_ENABLED + DEMO_MODE, backed by the in-memory org in demo/dataverse.
 * `live`: DATAVERSE_ENABLED against DATAVERSE_URL.
 */
export type DataverseMode = "off" | "mock" | "live";

export interface KitServices {
  dataverse: DataverseMode;
  roles: RoleProvider;
  auditLog: AuditLog;
  /** Null when Dataverse is off. */
  auditReader: AuditReader | null;
  approvals: ApprovalService;
  /** Null when Dataverse is off. */
  flowApprovals: PowerAutomateApprovalReader | null;
  /** DATABASE_URL connection backing audit_log and approvals; null means they are in memory. */
  sql: SqlClient | null;
}

const MOCK_MIRROR_PREFIX = "cr7f3_";

function connect(demo: boolean): { client: DataverseClient; mirrorPrefix: string | null } {
  if (demo) {
    const { approvals, responses } = mockFlowApprovals(new Date());
    const { client } = createMockDataverse({
      seed: { msdyn_flow_approvals: approvals, msdyn_flow_approvalresponses: responses },
    });
    return { client, mirrorPrefix: readMirrorPrefix() ?? MOCK_MIRROR_PREFIX };
  }
  const connection = readConnection();
  return {
    client: httpDataverseClient(connection, clientCredentialsTokenSource(connection)),
    mirrorPrefix: readMirrorPrefix(),
  };
}

async function seedDemoApprovals(approvals: ApprovalService) {
  const [, approver, operator] = DEMO_PERSONAS;
  const as = (persona: (typeof DEMO_PERSONAS)[number], roles: Actor["roles"]): Actor => ({
    id: persona.id,
    name: persona.name,
    roles,
  });
  const maker = as(operator, ["Ledger.Operator"]);
  const lease = await approvals.submit(maker, { title: "Office lease — October", counterparty: "Litware Leasing", amountMinor: 12_500_00 });
  await approvals.decide(as(approver, ["Ledger.Approver"]), lease.id, "approved", "Matches the lease schedule.");
  await approvals.submit(maker, { title: "Vendor payout", counterparty: "Proseware", amountMinor: 2_150_00 });
}

async function build(): Promise<KitServices> {
  const demo = isDemoMode();
  const sql = getSqlClient();
  const auditLog = sql ? sqlAuditLog(sql) : memoryAuditLog();
  const store = sql ? sqlApprovalStore(sql) : memoryApprovalStore();
  const transaction = sql ? sql.transaction : undefined;

  let services: KitServices;
  if (!isDataverseEnabled()) {
    services = {
      dataverse: "off",
      roles: claimsRoleProvider,
      auditLog,
      auditReader: null,
      approvals: createApprovalService({ store, auditLog, mirror: null, transaction }),
      flowApprovals: null,
      sql,
    };
  } else {
    const { client, mirrorPrefix } = connect(demo);
    const mapping = demo ? MOCK_ROLE_MAPPING : readRoleMapping();
    services = {
      dataverse: demo ? "mock" : "live",
      roles: cachePerSession(dataverseRoleProvider(client, mapping), SESSION_MAX_AGE_SECONDS * 1000),
      auditLog,
      auditReader: dataverseAuditReader(client),
      approvals: createApprovalService({
        store,
        auditLog,
        mirror: mirrorPrefix ? approvalStatusMirror(client, mirrorPrefix) : null,
        transaction,
      }),
      flowApprovals: flowApprovalReader(client),
      sql,
    };
  }

  if (demo && !sql) await seedDemoApprovals(services.approvals);
  return services;
}

const store = globalThis as typeof globalThis & { __ledgerKitServices?: Promise<KitServices> };

/** Process-wide kit services, selected by DATAVERSE_ENABLED (and DEMO_MODE for the mock org). */
export function getKitServices(): Promise<KitServices> {
  store.__ledgerKitServices ??= build().catch((error: unknown) => {
    store.__ledgerKitServices = undefined;
    throw error;
  });
  return store.__ledgerKitServices;
}
