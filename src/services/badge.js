class Badge {
  constructor() {
    this.disable();
    chrome.browserAction.setBadgeBackgroundColor({ color: "#FF4081" });

    chrome.browserAction.onClicked.addListener(tab => {
      this.onClick(tab);
    });

    this.clearCounter();
  }

  disable() {
    this.isEnabled = false;
    chrome.browserAction.disable();
  }
  enable() {
    this.isEnabled = true;
    chrome.browserAction.enable();
  }

  increment() {
    this.counter++;
    this.updateBagde();
  }

  decrement() {
    this.counter--;
    this.updateBagde();
  }

  updateBagde() {
    chrome.browserAction.setBadgeText({
      text: (this.isEnabled && this.counter && `${this.counter}`) || ""
    });
  }

  clearCounter() {
    this.counter = 0;
    this.updateBagde();
  }

  onClick() {
    chrome.tabs.create({ url: "https://sme.tinkoff.ru" });
    this.clearCounter();
  }
}

export default new Badge();
