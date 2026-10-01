/**
 * Dataverse Web API (v9.2) payload shapes, kept byte-for-byte compatible with what a real
 * organization returns so the in-memory mock in `kit/demo/dataverse/` and a live org are
 * interchangeable behind `DataverseClient`.
 */

export type Guid = string;

export const FORMATTED_VALUE = "@OData.Community.Display.V1.FormattedValue";

export interface ODataCollection<T> {
  "@odata.context"?: string;
  "@odata.nextLink"?: string;
  value: T[];
}

/** `systemuser` EntityType (subset). */
export interface DataverseSystemUser {
  systemuserid: Guid;
  fullname: string;
  azureactivedirectoryobjectid: Guid | null;
  applicationid?: Guid | null;
}

/** `role` EntityType (Security Role) as returned by `RetrieveAadUserRoles`. */
export interface DataverseRole {
  roleid: Guid;
  name: string;
  _roletemplateid_value: Guid | null;
  _businessunitid_value?: Guid;
}

/** `PagingInfo` ComplexType. */
export interface PagingInfo {
  PageNumber: number;
  Count: number;
  ReturnTotalRecordCount?: boolean;
  PagingCookie?: string | null;
}

/** Entity values inside an audit detail, e.g. `{ "@odata.type": "#Microsoft.Dynamics.CRM.account", name: "..." }`. */
export interface AuditEntityValues {
  "@odata.type"?: string;
  [attribute: string]: unknown;
}

/** `AttributeAuditDetail` ComplexType. */
export interface AttributeAuditDetail {
  "@odata.type": "#Microsoft.Dynamics.CRM.AttributeAuditDetail";
  /** The related `audit` row (who, when, which action). */
  AuditRecord: DataverseAudit;
  InvalidNewValueAttributes: string[];
  LocLabelLanguageCode: number;
  DeletedAttributes: { Count: number; Keys: number[]; Values: string[] };
  OldValue: AuditEntityValues;
  NewValue: AuditEntityValues;
}

/** Any other `AuditDetail` subtype (`RelationshipAuditDetail`, `ShareAuditDetail`, ...). */
export interface OtherAuditDetail {
  "@odata.type": string;
  AuditRecord: DataverseAudit;
  [property: string]: unknown;
}

export type AuditDetail = AttributeAuditDetail | OtherAuditDetail;

export function isAttributeAuditDetail(detail: AuditDetail): detail is AttributeAuditDetail {
  return detail["@odata.type"] === "#Microsoft.Dynamics.CRM.AttributeAuditDetail";
}

/** `AuditDetailCollection` ComplexType. */
export interface AuditDetailCollection {
  AuditDetails: AuditDetail[];
  MoreRecords: boolean;
  PagingCookie: string | null;
  TotalRecordCount: number;
}

/** `RetrieveRecordChangeHistoryResponse` ComplexType. */
export interface RetrieveRecordChangeHistoryResponse {
  "@odata.context"?: string;
  AuditDetailCollection: AuditDetailCollection;
}

/** `audit.operation` choice. */
export const AUDIT_OPERATION = { Create: 1, Update: 2, Delete: 3, Access: 4 } as const;

/** `audit.action` choice (table row events). */
export const AUDIT_ACTION_LABELS: Record<number, string> = {
  1: "Create",
  2: "Update",
  3: "Delete",
  12: "Merge",
  13: "Assign",
  41: "Set State",
};

/** `audit` EntityType (read-only table). `_userid_value` is the impersonated user when `CallerObjectId` is used. */
export interface DataverseAudit {
  auditid: Guid;
  createdon: string;
  action: number;
  operation: number;
  objecttypecode: string;
  _objectid_value: Guid;
  _userid_value: Guid;
  _callinguserid_value: Guid | null;
  "_userid_value@OData.Community.Display.V1.FormattedValue"?: string;
  "_callinguserid_value@OData.Community.Display.V1.FormattedValue"?: string;
  "action@OData.Community.Display.V1.FormattedValue"?: string;
}

/** `msdyn_flow_approvalstage` global choice. */
export const FLOW_APPROVAL_STAGE = {
  NotSpecified: 192350000,
  Basic: 192350001,
  Complete: 192351000,
} as const;

/** `msdyn_flow_approval` (Power Automate Approval) table, subset. Read-only for this app. */
export interface MsdynFlowApproval {
  msdyn_flow_approvalid: Guid;
  msdyn_flow_approval_title: string | null;
  msdyn_flow_approval_details: string | null;
  msdyn_flow_approval_result: string | null;
  msdyn_flow_approval_stage: number;
  "msdyn_flow_approval_stage@OData.Community.Display.V1.FormattedValue"?: string;
  msdyn_flow_approval_completedon: string | null;
  createdon: string;
  _ownerid_value?: Guid;
  "_ownerid_value@OData.Community.Display.V1.FormattedValue"?: string;
}

/** `msdyn_flow_approvalresponse` (Approval Response) table, subset. Read-only for this app. */
export interface MsdynFlowApprovalResponse {
  msdyn_flow_approvalresponseid: Guid;
  _msdyn_flow_approvalresponse_approval_value: Guid;
  msdyn_flow_approvalresponse_response: string;
  msdyn_flow_approvalresponse_comments: string | null;
  createdon: string;
  _ownerid_value?: Guid;
  "_ownerid_value@OData.Community.Display.V1.FormattedValue"?: string;
}

/** Web API error body: `{ "error": { "code": "0x80040217", "message": "..." } }`. */
export interface DataverseErrorBody {
  error?: { code?: string; message?: string };
}
