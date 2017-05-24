function log () {
	// DEBUG MODE OFF
	return;

	console.log.apply(console, arguments);
}

function unzip(arr) {
	var elements = arr.length;
	var len = arr[0].length;
	var final = [];

	for (var i = 0; i < len; i++) {
		var temp = [];
		for (var j = 0; j < elements; j++) {
			temp.push(arr[j][i]);
		}
		final.push(temp);
	}

	return final;
}

function compare(newValue, oldValue) {
	return Object.keys(newValue).filter(key => {
		return Object.keys(oldValue).filter(() => {
			return JSON.stringify(newValue[key]) !== JSON.stringify(oldValue[key]);
		}).length;
	});
}




const CURRENCIES = {
	"643": "₽",
	"840": "$",
	"978": "€",
	"826": "£"
};

const TRANSACTION_TYPES = {
	"Debit": "-",
	"Credit": "+"
};

const STRINGS = {
	"authorized": "Сумма авторизаций",
	"otb": "Доступный остаток",
	"balance": "Баланс",
	"pendingRequisitions": "Списания по картотеке",
	"pendingPayments": "Платежи в ожидании",
	"transitBalance": "Транзитный счёт"
};

const IGNORING_ACCOUNTS = ["transitBalance"];


var sessionID$ = Rx.Observable.create(function (observer) {
		log("sessionID$");

		chrome.cookies.get({
			url: "https://sme.tinkoff.ru/",
			name: "sessionID"
		}, function (cookie) {
			if (cookie && cookie.value) {
				log("SessionId", cookie.value);

				observer.next(cookie.value);
				observer.complete();
			} else {
				observer.error();
			}
		});
	})
	.retryWhen(x => Rx.Observable.interval(1000))
	.do(()=>{
		chrome.browserAction.enable();
		chrome.browserAction.setBadgeText({text: `${badgeCount || ""}`});
	});

var validate$ = sessionID$.flatMap(sessionID => {
		log("validate$");
		let promise = fetch("https://sme.tinkoff.ru/api/v1/session/validate", {
				method: "POST",
				headers: {
					"sessionID": sessionID
				}
			})
			.then((data) => data.json())
			.then((data) => {
				if (data.errorMessage) {
					notificate(data.errorMessage);
					chrome.cookies.remove({
						url: "https://sme.tinkoff.ru/",
						name: "sessionID"
					});

					chrome.browserAction.disable();
					chrome.browserAction.setBadgeText({text: ""});

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
	.subscribe((x) => {
		log(x);
	});

var companyID$ = sessionID$.flatMap(sessionID => {
		log("companyID$");
		let promise = fetch("https://business.tinkoff.ru/api/v1/users/config?keys=business%2Csmeib", {
				headers: {
					"sessionID": sessionID
				}
			})
			.then((data) => data.json())
			.then((data) => {
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

var accounts$ = companyID$.flatMap(companyID => {
	log("accounts$");
	return sessionID$.flatMap(sessionID => {
			let promise = fetch(`https://sme.tinkoff.ru/api/v1/company/${companyID}/accounts`, {
				headers: {
					"sessionID": sessionID
				}
			})
			.then(data => data.json())
			.then(data => data.result);

		return Rx.Observable.fromPromise(promise);
	});
}).retryWhen(() => Rx.Observable.interval(10000));

var operations$ = accounts$.publishReplay()
	.refCount()
	.flatMap(accounts => {
		log("operations$");
		return companyID$.combineLatest(sessionID$, (companyID, sessionID) => {
				let promises = accounts.map(account => {
					return fetch(`https://sme.tinkoff.ru/api/v1/company/${companyID}/operations?offset=0&agreementNumber=${account.agreementNumber}`, {
							headers: {
								"sessionID": sessionID
							}
						})
						.then(data => data.json())
						.then(data => data.result)
						.then(data => {
							data.forEach(item => {
								item._accountName = account.name;
							});

							return data;
						});
				});

				let promiseAll = Promise.all(promises);

				return Rx.Observable.fromPromise(promiseAll);
			})
			.flatMap(x => x);
	})
	.retryWhen(() => Rx.Observable.interval(10000));

var paymentDocuments$ = accounts$.publishReplay()
	.refCount()
	.flatMap(accounts => {
		log("statistics$");
		return companyID$.combineLatest(sessionID$, (companyID, sessionID) => {
			let promises = accounts.map(account => {
				return fetch(`https://sme.tinkoff.ru/api/v1/company/${companyID}/paymentDocuments/statistics?agreementNumber=${account.agreementNumber}`, {
					headers: {
						"sessionID": sessionID
					}
				})
					.then(data => data.json())
					.then(data => data.result)
					.then(data => {

						return {
							balance: data.reduce((acc, item) => {
								return acc + item.statistics.reduce((acc, item) => acc + item.aggregatedSum, 0);
							}, 0),
							name: account.name,
							currency: account.currency
						};
					});
			});

			let promiseAll = Promise.all(promises);

			return Rx.Observable.fromPromise(promiseAll);
		})
		.flatMap(x => x);
	})
	.retryWhen(() => Rx.Observable.interval(10000));



Rx.Observable.interval(10000)
	.startWith(0)
	.switchMap(() => operations$)
	.bufferCount(2, 1)
	.map(x => {
		return unzip(x);
	})
	.subscribe(function (accounts) {
		log("subscribe", accounts);
		accounts.forEach(account => {
			if (!account[1]) {
				return;
			}

			let ids = account[0].map(item => {
				return item.id;
			});

			let newItems = account[1].filter(item => {
				return !ids.filter(id => id === item.id).length;
			});

			newItems.map(item => {
				return {
					type: TRANSACTION_TYPES[item.type],
					title: item._accountName,
					amount: item.amount,
					description: item.description,
					currency: CURRENCIES[item.authorizedInfo.authorizedCurrency] || ""
				};
			}).forEach(e => {
				notificate(e.title, [e.type, e.amount, e.currency].join("") + "\n\n" + e.description);
			});


			let existedItems = account[1].filter(e => {
				return ids.filter(id => id === e.id).length;
			});

			existedItems.map(item => {
					let previousItem = account[0].find(el => el.id === item.id);

					return {
						item: item,
						updated: compare(previousItem, item)
					};
				})
				.filter(existed => existed.updated.length)
				.forEach(item => {
					let result = item.updated.map(property => {
						let value = STRINGS[property] || property;

						value += ": " + item[property];
						return value;
					}).join("\n");

					notificate(account[0].name, result);
				});
		});
	});


Rx.Observable.interval(10000)
	.startWith(0)
	.switchMap(() => accounts$)
	.bufferCount(2,1)
	.map(x => {
		return unzip(x);
	})
	.subscribe(function(accounts) {
		log("subscribe", accounts);
		accounts.forEach(account => {
			if (!account[1]) {
				return;
			}

			let changedKeys = compare(account[0].balance, account[1].balance)
				.filter(property => !IGNORING_ACCOUNTS.includes(property));

			if (changedKeys.length) {
				let result = changedKeys.map(property => {
					let value = STRINGS[property] || property;

					value = [value, ": ", account[1].balance[property], CURRENCIES[account[1].currency] || ""].join("");
					return value;
				}).join("\n");

				notificate(account[0].name, result);
			}
		});
	});


Rx.Observable.interval(10000)
	.startWith(0)
	.switchMap(() => paymentDocuments$)
	.bufferCount(2,1)
	.map(x => {
		return unzip(x);
	})
	.subscribe(function(payments) {
		log("subscribe", payments);
		payments.forEach(payment => {
			if (!payment[1]) {
				return;
			}

			if (payment[0].balance != payment[1].balance) {
				let value = STRINGS["transitBalance"];

				value = [value, ": ", payment[1].balance, CURRENCIES[payment[1].currency] || ""].join("");

				notificate(payment[0].name, value);
			}
		});
	});


var badgeCount = 0;

function notificate(title, message) {
	chrome.notifications.create("tcs-notifier-" + Math.random(), {
		type: "basic",
		title: title || "",
		message: message || "",
		iconUrl: "/icons/icon128.png",
		requireInteraction: true
	});
	badgeCount++;
	chrome.browserAction.setBadgeText({text: `${badgeCount}`});
}

chrome.browserAction.disable();
chrome.browserAction.setBadgeBackgroundColor({color: "#FF4081"});

chrome.browserAction.onClicked.addListener(function () {
	badgeCount = 0;
	chrome.browserAction.setBadgeText({text: ""});
});