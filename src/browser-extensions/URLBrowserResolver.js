const fetchUrl = url => {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(response => {
        if (!response.ok) {
          reject(new Error("HTTP error, status = " + response.status));
        }
        return response.arrayBuffer();
      }, result => {
        reject(result);
      })
      .then(function (buffer) {
        resolve(buffer);
      }, result => {
        reject(result);
      });
  });
};

class URLBrowserResolver {
  constructor(fs) {
    this.fs = fs;
    this.resolving = {};
  }

  resolve(url) {
    if (!this.resolving[url]) {
      this.resolving[url] = new Promise((resolve, reject) => {
        if (url.toLowerCase().indexOf('https://') === 0 || url.toLowerCase().indexOf('http://') === 0) {
          fetchUrl(url).then(buffer => {
            this.fs.writeFileSync(url, buffer);
            resolve();
          }, result => {
            reject(result);
          });
        } else {
          // cannot be resolved
          resolve();
        }
      });
    }

    return this.resolving[url];
  }

  resolved() {
    return new Promise((resolve, reject) => {
      Promise.all(Object.values(this.resolving)).then(() => {
        resolve();
      }, result => {
        reject(result);
      });
    });
  }

}

export default URLBrowserResolver;