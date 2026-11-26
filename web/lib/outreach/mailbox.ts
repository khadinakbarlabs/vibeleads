/**
 * App-side re-export of the outreach sub-address composer. Implementation
 * lives in `submitter/src/mailbox.ts`; one helper, one truth.
 */
import "server-only";

export {
  outreachAddress as composeOutreachAddress,
  type OutreachAddress,
  type SubAddressInput,
} from "../../submitter/src/mailbox";
