import type { Actor } from "../kit/actor.ts";
import type { ApprovalRequest, ApprovalStatusMirror } from "../kit/approvals.ts";
import { assertWritable, type DataverseClient } from "./client.ts";

/**
 * Mirrors kit approval status into an app-owned custom table `<prefix>ledgerapproval`
 * (entity set `<prefix>ledgerapprovals`). Writes are impersonated as the acting user.
 */
export function approvalStatusMirror(client: DataverseClient, prefix: string): ApprovalStatusMirror {
  const entitySet = `${prefix}ledgerapprovals`;
  assertWritable(entitySet);
  const column = (name: string) => `${prefix}${name}`;

  return {
    entitySet,
    async publish(request: ApprovalRequest, actor: Actor) {
      const options = { callerObjectId: actor.id };
      const status = { [column("status")]: request.status, [column("comment")]: request.comment };

      if (request.mirror) {
        await client.update(entitySet, request.mirror.id, status, options);
        return request.mirror.id;
      }
      return client.create(
        entitySet,
        {
          [column("name")]: request.title,
          [column("kitrequestid")]: request.id,
          [column("counterparty")]: request.counterparty,
          [column("amount")]: request.amountMinor / 100,
          ...status,
        },
        options,
      );
    },
  };
}
