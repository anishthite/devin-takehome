import { guidLiteral, type DataverseClient } from "./client.ts";
import {
  FLOW_APPROVAL_STAGE,
  FORMATTED_VALUE,
  type Guid,
  type MsdynFlowApproval,
  type MsdynFlowApprovalResponse,
} from "./types.ts";

/** Display model for an existing Power Automate approval. */
export interface FlowApprovalView {
  id: Guid;
  title: string;
  details: string | null;
  stage: string;
  result: string | null;
  owner: string | null;
  createdOn: string;
  completedOn: string | null;
  responses: Array<{ id: Guid; response: string; comments: string | null; responder: string | null; respondedOn: string }>;
}

/** Read-only view of Power Automate approvals (`msdyn_flow_approval` / `msdyn_flow_approvalresponse`). */
export interface PowerAutomateApprovalReader {
  list(top?: number): Promise<FlowApprovalView[]>;
}

const STAGE_LABELS: Record<number, string> = {
  [FLOW_APPROVAL_STAGE.NotSpecified]: "Not specified",
  [FLOW_APPROVAL_STAGE.Basic]: "In progress",
  [FLOW_APPROVAL_STAGE.Complete]: "Complete",
};

const APPROVAL_COLUMNS = [
  "msdyn_flow_approvalid",
  "msdyn_flow_approval_title",
  "msdyn_flow_approval_details",
  "msdyn_flow_approval_result",
  "msdyn_flow_approval_stage",
  "msdyn_flow_approval_completedon",
  "createdon",
  "_ownerid_value",
].join(",");

const RESPONSE_COLUMNS = [
  "msdyn_flow_approvalresponseid",
  "_msdyn_flow_approvalresponse_approval_value",
  "msdyn_flow_approvalresponse_response",
  "msdyn_flow_approvalresponse_comments",
  "createdon",
  "_ownerid_value",
].join(",");

export function flowApprovalReader(client: DataverseClient): PowerAutomateApprovalReader {
  return {
    async list(top = 25) {
      const approvals = await client.retrieveMultiple<MsdynFlowApproval>(
        "msdyn_flow_approvals",
        `$select=${APPROVAL_COLUMNS}&$orderby=createdon desc&$top=${top}`,
      );
      return Promise.all(
        approvals.value.map(async (approval) => {
          const responses = await client.retrieveMultiple<MsdynFlowApprovalResponse>(
            "msdyn_flow_approvalresponses",
            `$select=${RESPONSE_COLUMNS}&$filter=_msdyn_flow_approvalresponse_approval_value eq ${guidLiteral(approval.msdyn_flow_approvalid)}&$orderby=createdon asc`,
          );
          return {
            id: approval.msdyn_flow_approvalid,
            title: approval.msdyn_flow_approval_title ?? "(untitled)",
            details: approval.msdyn_flow_approval_details,
            stage:
              approval[`msdyn_flow_approval_stage${FORMATTED_VALUE}`] ??
              STAGE_LABELS[approval.msdyn_flow_approval_stage] ??
              String(approval.msdyn_flow_approval_stage),
            result: approval.msdyn_flow_approval_result,
            owner: approval[`_ownerid_value${FORMATTED_VALUE}`] ?? approval._ownerid_value ?? null,
            createdOn: approval.createdon,
            completedOn: approval.msdyn_flow_approval_completedon,
            responses: responses.value.map((r) => ({
              id: r.msdyn_flow_approvalresponseid,
              response: r.msdyn_flow_approvalresponse_response,
              comments: r.msdyn_flow_approvalresponse_comments,
              responder: r[`_ownerid_value${FORMATTED_VALUE}`] ?? r._ownerid_value ?? null,
              respondedOn: r.createdon,
            })),
          };
        }),
      );
    },
  };
}
