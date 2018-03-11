import { compare, log, unzip } from "./helpers";
import * as Rx from "rxjs/Rx";
import { CURRENCIES, IGNORING_ACCOUNTS, STRINGS, TRANSACTION_TYPES } from "./constants";
import { operations$ } from "./streams/operations";
import { accounts$ } from "./streams/accounts";
import { paymentDocuments$ } from "./streams/paymentDocuments";
import notification from "./services/notification"

Rx.Observable.interval(10000)
  .startWith(0)
  .switchMap(() => accounts$)
  .bufferCount(2, 1)
  .map(x => {
    return unzip(x);
  })
  .subscribe(function(accounts) {
    log("accounts", accounts);
    accounts.forEach(account => {
      if (!account[1]) {
        return;
      }

      let changedKeys = compare(account[0].balance, account[1].balance).filter(
        property => !IGNORING_ACCOUNTS.includes(property)
      );

      if (changedKeys.length) {
        let result = changedKeys
          .map(property => {
            let value = STRINGS[property] || property;

            value = [
              value,
              ": ",
              account[1].balance[property],
              CURRENCIES[account[1].currency] || ""
            ].join("");
            return value;
          })
          .join("\n");

        notification.show(account[0].name, result);
      }
    });
  });

Rx.Observable.interval(10000)
  .startWith(0)
  .switchMap(() => paymentDocuments$)
  .bufferCount(2, 1)
  .map(x => {
    return unzip(x);
  })
  .subscribe(function(payments) {
    log("payments", payments);
    payments.forEach(payment => {
      if (!payment[1]) {
        return;
      }

      if (payment[0].balance !== payment[1].balance) {
        let value = STRINGS["entry"];

        value = [
          value,
          ": ",
          payment[1].balance,
          CURRENCIES[payment[1].currency] || ""
        ].join("");

        notification.show(payment[0].name, value);
      }
    });
  });


Rx.Observable.interval(10000)
  .startWith(0)
  .switchMap(() => operations$)
  .bufferCount(2, 1)
  .map(x => unzip(x))
  .subscribe((operations) => {
    log("operations", operations);
    operations.forEach(operation => {
      if (!operation[1]) {
        return;
      }

      let ids = operation[0].map(item => item.id);

      let newItems = operation[1].filter(
        item => !ids.filter(id => id === item.id).length
      );

      newItems
        .map(item => ({
          type: TRANSACTION_TYPES[item.type],
          title: item._accountName,
          amount: item.amount,
          description: item.description,
          currency: CURRENCIES[item.authorizedInfo.authorizedCurrency] || ""
        }))
        .forEach(e => {
          notification.show(
            e.title,
            [e.type, e.amount, e.currency].join("") + "\n\n" + e.description
          );
        });

      let existedItems = operation[1].filter(
        e => ids.filter(id => id === e.id).length
      );

      existedItems
        .map(item => {
          let previousItem = operation[0].find(el => el.id === item.id);

          return {
            item: item,
            updated: compare(previousItem, item)
          };
        })
        .filter(existed => existed.updated.length)
        .forEach(item => {
          let result = item.updated
            .map(property => {
              let value = STRINGS[property] || property;

              value += ": " + item[property];
              return value;
            })
            .join("\n");

          notification.show(operation[0].name, result);
        });
    });
  });
