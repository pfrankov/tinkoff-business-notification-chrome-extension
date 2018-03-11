import * as Rx from "rxjs/Rx";
import { connected$ } from "./session";
import { log } from "../helpers";
import ajax from "../services/ajax";

export const companyID$ = connected$
  .flatMap(() => {
    log("companyID$");
    let promise = ajax
      .get(
        "https://business.tinkoff.ru/api/v1/users/config?keys=business%2Csmeib"
      )
      .then(data => {
        if (!data.success) {
          return Promise.reject();
        }
        return data;
      })
      .then(data => data.result.business.companyId);

    return Rx.Observable.fromPromise(promise);
  })
  .retryWhen(() => Rx.Observable.interval(10000))
  .publishReplay()
  .refCount();
