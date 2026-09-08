import type { Rule } from "../types";
import { amountClustering } from "./amountClustering";
import { diagnosisProcedureMismatch } from "./diagnosisProcedureMismatch";
import { duplicateClaim } from "./duplicateClaim";
import { phantomBilling } from "./phantomBilling";
import { rapidResubmission } from "./rapidResubmission";
import { unbundling } from "./unbundling";
import { upcoding } from "./upcoding";
import { weekendAnomaly } from "./weekendAnomaly";

export const RULES: Rule[] = [
  duplicateClaim,
  rapidResubmission,
  upcoding,
  unbundling,
  phantomBilling,
  weekendAnomaly,
  diagnosisProcedureMismatch,
  amountClustering,
];

export {
  amountClustering,
  diagnosisProcedureMismatch,
  duplicateClaim,
  phantomBilling,
  rapidResubmission,
  unbundling,
  upcoding,
  weekendAnomaly,
};
