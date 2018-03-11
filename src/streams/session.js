import * as Rx from "rxjs/Rx";
import { log } from "../helpers";
import ajax from "../services/ajax";
import badge from "../services/badge";
import notification from "../services/notification";

export const connected$ = Rx.Observable.create(function(observer) {
  log("sessionID$");

  chrome.cookies.get(
    {
      url: "https://sme.tinkoff.ru/",
      name: "sessionID"
    },
    cookie => {
      if (cookie && cookie.value) {
        log("SessionId", cookie.value);

        observer.next(cookie.value);
        observer.complete();
      } else {
        observer.error();
      }
    }
  );
})
  .retryWhen(() => Rx.Observable.interval(1000))
  .do(sessionID => {
    ajax.setToken(sessionID);
    badge.enable();
  });

export const validate$ = connected$
  .flatMap(() => {
    log("validate$");
    const promise = ajax.post("/api/v1/session/validate").then(data => {
      if (data.errorMessage) {
        notification.show(data.errorMessage);
        chrome.cookies.remove({
          url: "https://sme.tinkoff.ru/",
          name: "sessionID"
        });

        badge.disable();

        return Promise.reject();
      }
      return data;
    });
    return Rx.Observable.fromPromise(promise);
  })
  .retryWhen(() => Rx.Observable.interval(10000));

// Update token every 60 seconds
Rx.Observable.interval(60000)
  .switchMap(() => validate$)
  .subscribe(x => {
    log(x);
  });
