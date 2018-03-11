import { log } from "../helpers";
import * as Rx from "rxjs/Rx";
import { connected$ } from "./session";
import ajax from "../services/ajax";
import { accounts$ } from "./accounts";
import { companyID$ } from "./company";

export const operations$ = accounts$
  .publishReplay()
  .refCount()
  .flatMap(accounts => {
    log("operations$");
    return companyID$
      .combineLatest(connected$, companyID => {
        const promises = accounts.map(account => {
          return ajax
            .get(
              `/api/v1/company/${companyID}/operations?offset=0&agreementNumber=${
                account.agreementNumber
              }`
            )
            .then(data => data.result)
            .then(data => {
              data.forEach(item => {
                item._accountName = account.name;
              });

              return data;
            });
        });

        const promiseAll = Promise.all(promises);

        return Rx.Observable.fromPromise(promiseAll);
      })
      .flatMap(x => x);
  })
  .retryWhen(() => Rx.Observable.interval(10000));
