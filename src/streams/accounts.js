import * as Rx from "rxjs/Rx";
import { connected$ } from "./session";
import { log } from "../helpers";
import ajax from "../services/ajax";
import { companyID$ } from "./company";

export const accounts$ = companyID$
  .flatMap(companyID => {
    log("accounts$");
    return connected$.flatMap(() => {
      const promise = ajax
        .get(`/api/v1/company/${companyID}/accounts`)
        .then(data => data.result);

      return Rx.Observable.fromPromise(promise);
    });
  })
  .retryWhen(() => Rx.Observable.interval(10000));
