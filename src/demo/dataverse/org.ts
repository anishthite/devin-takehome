import {
  FLOW_APPROVAL_STAGE,
  FORMATTED_VALUE,
  type DataverseRole,
  type DataverseSystemUser,
  type Guid,
  type MsdynFlowApproval,
  type MsdynFlowApprovalResponse,
} from "../../lib/dataverse/types.ts";
import { DEFAULT_ROLE_NAMES, type RoleMapping } from "../../lib/dataverse/role-provider.ts";
import { DEMO_PERSONAS } from "../personas.ts";

/** Seed data for the in-memory Dataverse organization used in demo mode and tests. */

export const MOCK_DATAVERSE_URL = "https://ledger-demo.crm.dynamics.com";

export const MOCK_BUSINESS_UNIT_ID = "b0000000-0000-4000-b000-000000000001";
export const MOCK_SYSTEM_ADMINISTRATOR_TEMPLATE_ID = "e0000000-0000-4000-e000-000000000001";

/** Application user the app authenticates as (client credentials); the impersonator in audit rows. */
export const MOCK_APPLICATION_USER: DataverseSystemUser = {
  systemuserid: "c0000000-0000-4000-c000-000000000000",
  fullname: "# Ledger Integration",
  azureactivedirectoryobjectid: null,
  applicationid: "c0000000-0000-4000-c000-0000000000ff",
};

/** One Dataverse user per demo persona, keyed by the persona's mock Entra object id. */
export const MOCK_SYSTEM_USERS: readonly DataverseSystemUser[] = [
  MOCK_APPLICATION_USER,
  ...DEMO_PERSONAS.map((persona, i) => ({
    systemuserid: `c0000000-0000-4000-c000-00000000000${i + 1}`,
    fullname: persona.name,
    azureactivedirectoryobjectid: persona.id,
  })),
];

function role(roleid: Guid, name: string, template: Guid | null = null): DataverseRole {
  return { roleid, name, _roletemplateid_value: template, _businessunitid_value: MOCK_BUSINESS_UNIT_ID };
}

export const MOCK_ROLES = {
  systemAdministrator: role("d0000000-0000-4000-d000-000000000001", "System Administrator", MOCK_SYSTEM_ADMINISTRATOR_TEMPLATE_ID),
  basicUser: role("d0000000-0000-4000-d000-000000000002", "Basic User"),
  ledgerApprover: role("d0000000-0000-4000-d000-000000000003", DEFAULT_ROLE_NAMES["Ledger.Approver"]),
  ledgerOperator: role("d0000000-0000-4000-d000-000000000004", DEFAULT_ROLE_NAMES["Ledger.Operator"]),
  ledgerViewer: role("d0000000-0000-4000-d000-000000000005", DEFAULT_ROLE_NAMES["Ledger.Viewer"]),
} as const;

export interface MockTeam {
  name: string;
  members: Guid[];
  roles: DataverseRole[];
}

const userFor = (personaIndex: number) => MOCK_SYSTEM_USERS[personaIndex + 1].systemuserid;

/** Direct security-role assignments (systemuserroles), by systemuserid. */
export const MOCK_USER_ROLES: Record<Guid, DataverseRole[]> = {
  [userFor(0)]: [MOCK_ROLES.systemAdministrator, MOCK_ROLES.basicUser],
  [userFor(1)]: [MOCK_ROLES.basicUser],
  [userFor(2)]: [MOCK_ROLES.ledgerOperator, MOCK_ROLES.basicUser],
  [userFor(3)]: [MOCK_ROLES.ledgerViewer, MOCK_ROLES.basicUser],
};

/** The approver persona gets its Dataverse role through team membership. */
export const MOCK_TEAMS: readonly MockTeam[] = [
  { name: "Payment Approvers", members: [userFor(1)], roles: [MOCK_ROLES.ledgerApprover] },
];

/** Admin is granted via the System Administrator role template; the rest match by role name. */
export const MOCK_ROLE_MAPPING: RoleMapping = {
  templateIds: { "Ledger.Admin": MOCK_SYSTEM_ADMINISTRATOR_TEMPLATE_ID },
  names: DEFAULT_ROLE_NAMES,
};

const ownerOf = (personaIndex: number) => ({
  _ownerid_value: userFor(personaIndex),
  [`_ownerid_value${FORMATTED_VALUE}`]: DEMO_PERSONAS[personaIndex].name,
});

/** Existing Power Automate approvals, shown read-only next to kit requests. */
export function mockFlowApprovals(now: Date): { approvals: MsdynFlowApproval[]; responses: MsdynFlowApprovalResponse[] } {
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  const completedId = "f0000000-0000-4000-f000-000000000001";
  const openId = "f0000000-0000-4000-f000-000000000002";
  return {
    approvals: [
      {
        msdyn_flow_approvalid: openId,
        msdyn_flow_approval_title: "Vendor onboarding: Proseware",
        msdyn_flow_approval_details: "New payee requested from the AP onboarding flow.",
        msdyn_flow_approval_result: null,
        msdyn_flow_approval_stage: FLOW_APPROVAL_STAGE.Basic,
        msdyn_flow_approval_completedon: null,
        createdon: ago(5),
        ...ownerOf(2),
      },
      {
        msdyn_flow_approvalid: completedId,
        msdyn_flow_approval_title: "Wire limit increase: Contoso Ltd",
        msdyn_flow_approval_details: "Raise daily wire limit to $75,000 for the quarterly retainer.",
        msdyn_flow_approval_result: "Approve",
        msdyn_flow_approval_stage: FLOW_APPROVAL_STAGE.Complete,
        msdyn_flow_approval_completedon: ago(26),
        createdon: ago(30),
        ...ownerOf(2),
      },
    ],
    responses: [
      {
        msdyn_flow_approvalresponseid: "f1000000-0000-4000-f000-000000000001",
        _msdyn_flow_approvalresponse_approval_value: completedId,
        msdyn_flow_approvalresponse_response: "Approve",
        msdyn_flow_approvalresponse_comments: "Matches the signed retainer.",
        createdon: ago(26),
        ...ownerOf(1),
      },
    ],
  };
}
