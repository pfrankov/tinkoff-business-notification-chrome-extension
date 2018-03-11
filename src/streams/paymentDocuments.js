import { log } from "../helpers";
import * as Rx from "rxjs/Rx";
import { connected$ } from "./session";
import ajax from "../services/ajax";
import { accounts$ } from "./accounts";
import { companyID$ } from "./company";

export const paymentDocuments$ = accounts$
  .publishReplay()
  .refCount()
  .flatMap(accounts => {
    log("statistics$");
    return companyID$
      .combineLatest(connected$, companyID => {
        const promises = accounts.map(account => {
          return ajax
            .get(
              `/api/v1/company/${companyID}/paymentDocuments/statistics?agreementNumber=${
                account.agreementNumber
              }`
            )
            .then(data => data.result)
            .then(data => {
              return {
                balance: data.reduce((acc, item) => {
                  return (
                    acc +
                    item.statistics.filter(el => el.status !== "DRAFT").reduce(
                      (acc, el) => acc + el.aggregatedSum,
                      0
                    )
                  );
                }, 0),
                name: account.name,
                currency: account.currency
              };
            });
        });

        const promiseAll = Promise.all(promises);

        return Rx.Observable.fromPromise(promiseAll);
      })
      .flatMap(x => x);
  })
  .retryWhen(() => Rx.Observable.interval(10000));
