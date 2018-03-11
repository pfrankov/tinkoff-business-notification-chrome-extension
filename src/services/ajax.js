class Ajax {
  constructor({ baseURL }) {
    this.baseURL = baseURL;
  }

  setToken(sessionID) {
    this.sessionID = sessionID;
  }

  request({ url, options }) {
    let _url = url;
    if (this.baseURL && !/^http/.test(url)) {
      _url = [this.baseURL, url]
        .filter(x => x)
        .map(x => x.replace(/^\/?(.*?)\/?$/, "$1"))
        .join("/");
    }

    return fetch(
      _url,
      Object.assign(
        {},
        {
          headers: {
            sessionID: this.sessionID
          }
        },
        options
      )
    ).then(response => response.json());
  }

  get(url) {
    return this.request({
      url
    });
  }

  post(url) {
    return this.request({
      url,
      options: {
        method: "POST"
      }
    });
  }
}

export default new Ajax({ baseURL: "https://sme.tinkoff.ru" });
